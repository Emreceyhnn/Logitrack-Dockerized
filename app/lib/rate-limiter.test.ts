 
import { describe, it, mock, beforeEach } from "node:test";
import { expect } from "expect";
import { rateLimit } from "./rate-limiter";
import { redis } from "./redis";
import "dotenv/config";

describe("Rate Limiter Utils", () => {
  // Her testten sonra oluşturduğumuz mock'ları (sahte fonksiyonları) temizliyoruz
  // Böylece bir testin verisi diğerini etkilemez
  beforeEach(() => {
    mock.restoreAll();
  });

  it("should allow request when under limit (Limit altındaysa izin vermeli)", async () => {
    // 1. ADIM: MOCK (SAHTE) OLUŞTURMA
    // Redis veritabanına gerçekten bağlanmak istemiyoruz (hem yavaş hem de testler bağımsız olmalı).
    // Bu yüzden Redis'in pipeline() işlemini taklit ediyoruz (Mocking).

    // 'exec' çalıştığında Redis bize kullanıcının o ana kadar kaç istek yaptığını döner.
    // Biz burada '1' döndüğünü (yani kullanıcının ilk isteği olduğunu) varsayıyoruz.
    const mockExec = mock.fn(async () => [1]);
    const mockIncr = mock.fn();
    const mockExpire = mock.fn();

    // redis.pipeline() fonksiyonunu ele geçirip kendi sahte objemizi döndürüyoruz
    mock.method(redis, "pipeline", () => ({
      incr: mockIncr,
      expire: mockExpire,
      exec: mockExec,
    }));

    // 2. ADIM: TEST EDİLECEK KODU ÇALIŞTIRMA
    // Limitimiz 5 olsun.
    const result = await rateLimit("192.168.1.1", 5, 60);

    // 3. ADIM: DOĞRULAMA (ASSERTION)
    expect(result.success).toBe(true); // İstek kabul edilmeli
    expect(result.limit).toBe(5);
    expect(result.remaining).toBe(4); // 1 istek yapıldığı için 4 kalmalı

    // Redis metodlarının gerçekten çağrıldığını da doğruluyoruz
    expect(mockIncr.mock.callCount()).toBe(1);
    expect(mockExpire.mock.callCount()).toBe(1);
    expect(mockExec.mock.callCount()).toBe(1);
  });

  it("should block request when limit is exceeded (Limit aşıldıysa engellemeli)", async () => {
    // Kullanıcının limiti aşmış (6. isteğini yapmış) olduğunu varsayıyoruz
    const mockExec = mock.fn(async () => [6]);
    const mockIncr = mock.fn();
    const mockExpire = mock.fn();

    mock.method(redis, "pipeline", () => ({
      incr: mockIncr,
      expire: mockExpire,
      exec: mockExec,
    }));

    // Limit 5
    const result = await rateLimit("192.168.1.1", 5, 60);

    expect(result.success).toBe(false); // İstek reddedilmeli
    expect(result.remaining).toBe(0); // Kalan hak eksiye düşmemeli, 0 kalmalı
  });

  it("should fall back to in-memory counting if redis throws an error (Redis çökerse in-memory sayaca geçmeli)", async () => {
    // Redis sunucusunun hata verdiğini veya çöktüğünü simüle ediyoruz
    mock.method(redis, "pipeline", () => {
      throw new Error("Redis connection timeout");
    });

    const result = await rateLimit("192.168.1.1", 5, 60);

    // Redis çökünce sistem kilitlenmemeli (istek kabul edilmeli), ama tamamen
    // korumasız da kalmamalı: in-memory fallback sayacı bu isteği sayar,
    // dolayısıyla remaining 5 değil 4 olur.
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });
});
