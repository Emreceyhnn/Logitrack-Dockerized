 
// 'node:test' modülü Node.js'in kendi test çalıştırıcısıdır (test runner). 
// 'describe': Testleri mantıksal gruplara ayırmak için kullanılır (örn: "getPriorityColor fonksiyonu testleri").
// 'it': Tek bir test senaryosunu tanımlar (örn: "şu girdiyi verince şu çıktıyı vermeli").
import { describe, it } from 'node:test';

// 'expect' kütüphanesi Jest testlerinde kullanılan yapıya benzer bir şekilde 
// değerlerin beklediğimiz gibi olup olmadığını kontrol etmemizi sağlar (Assertion/Doğrulama).
import { expect } from 'expect';

// Test edeceğimiz fonksiyonları kendi projemizden içeri aktarıyoruz.
import {
  getPriorityColor,
  getStatusMeta,
  getStatusColor,
  resolveStatusAlpha,
} from "./priorityColor";
import { Dictionary } from "./language/language";
import { NotificationType } from "./type/notification";

// Ana 'describe' bloğu: priorityColor.ts dosyasındaki tüm testleri kapsar.
describe("priorityColor Utils", () => {
  
  // Alt 'describe' bloğu: Sadece 'getPriorityColor' fonksiyonunun testlerini gruplar.
  describe("getPriorityColor", () => {
    
    // 'it' ile bir test senaryosu yazıyoruz. Parametre olarak testin ne yapması gerektiğini açıklarız.
    it("should return 'error' for CRITICAL and HIGH priorities", () => {
      // expect(fonksiyon(girdi)).toBe(beklenenÇıktı) mantığı ile çalışır.
      // .toBe() iki değerin birebir aynı (===) olup olmadığını kontrol eder.
      expect(getPriorityColor("CRITICAL")).toBe("error");
      expect(getPriorityColor("HIGH")).toBe("error");
      expect(getPriorityColor("critical")).toBe("error"); // Küçük harf kontrolü
    });

    it("should return 'warning' for MEDIUM priority", () => {
      expect(getPriorityColor("MEDIUM")).toBe("warning");
      expect(getPriorityColor("medium")).toBe("warning");
    });

    it("should return 'info' for LOW priority", () => {
      expect(getPriorityColor("LOW")).toBe("info");
      expect(getPriorityColor("low")).toBe("info");
    });

    it("should return 'default' for any, null, or undefined priorities", () => {
      expect(getPriorityColor("UNKNOWN")).toBe("default");
      expect(getPriorityColor("")).toBe("default"); // Boş string durumu
      
      // Beklenmedik tiplerin (null veya undefined) fonksiyona gelmesi durumunu test ediyoruz.
      expect(getPriorityColor(null as unknown as string)).toBe("default");
      expect(getPriorityColor(undefined as unknown as string)).toBe("default");
    });
  });

  // Başka bir fonksiyon için test grubu
  describe("getStatusMeta", () => {
    
    // MOCK (Sahte) Veri: Fonksiyonun çalışması için gereken büyük ve karmaşık bir objeyi
    // sadece testin ihtiyaç duyduğu kadarıyla sahte olarak oluşturuyoruz.
    const mockDict = {
      primaryColors: {
        info: "#mockInfo",
        warning: "#mockWarning",
        error: "#mockError",
        success: "#mockSuccess",
        secondary: "#mockSecondary",
      },
      drivers: {
        onDuty: "Görevde",
        offDuty: "Görev Dışı",
        onLeave: "İzinde",
      },
      vehicles: {
        statuses: {
          IN_SERVICE: "Hizmette",
        },
        priorities: {
          HIGH: "Yüksek",
        },
      },
      routes: {
        statuses: {
          PLANNED: "Planlandı",
        },
      },
      common: {
        UNKNOWN_STATUS: "Bilinmeyen",
      },
    } as unknown as Dictionary; // TypeScript tip hatası vermesin diye "as unknown as Dictionary" dedik.

    it("should return correct meta for info statuses", () => {
      const meta = getStatusMeta("IN_PROGRESS", mockDict);
      
      // .toEqual() objelerin veya dizilerin içeriğinin aynı olup olmadığını kontrol eder.
      // (Objeler bellekte farklı yerlerde tutulduğu için .toBe() ile kontrol edilemezler).
      expect(meta).toEqual({
        color: "#mockInfo",
        paletteKey: "info",
        label: "In progress",
      });
    });

    it("should return correct meta for warning statuses", () => {
      const meta = getStatusMeta("MEDIUM", mockDict);
      expect(meta).toEqual({
        color: "#mockWarning",
        paletteKey: "warning",
        label: "Medium", 
      });
    });

    it("should return correct meta for error statuses", () => {
      const meta = getStatusMeta("CRITICAL", mockDict);
      expect(meta).toEqual({
        color: "#mockError",
        paletteKey: "error",
        label: "Critical",
      });
    });

    it("should return correct meta for success statuses", () => {
      const meta = getStatusMeta("COMPLETED", mockDict);
      expect(meta).toEqual({
        color: "#mockSuccess",
        paletteKey: "success",
        label: "Completed",
      });
    });

    it("should fallback to secondary for any statuses", () => {
      const meta = getStatusMeta("UNKNOWN_STATE", mockDict);
      expect(meta).toEqual({
        color: "#mockSecondary",
        paletteKey: "secondary",
        label: "Unknown state",
      });
    });

    it("should resolve specific mapped label from dictionary if available", () => {
      const meta = getStatusMeta("ON_JOB", mockDict);
      expect(meta).toEqual({
        color: "#mockSuccess",
        paletteKey: "success",
        label: "Görevde", // Bu etiket, mockDict.drivers.onDuty'den başarıyla alınıyor mu diye bakıyoruz.
      });

      const metaOffDuty = getStatusMeta("OFF_DUTY", mockDict);
      expect(metaOffDuty).toEqual({
        color: "#mockSecondary",
        paletteKey: "secondary",
        label: "Görev Dışı", // Bu etiket, mockDict.drivers.offDuty'den başarıyla alınıyor mu diye bakıyoruz.
      });
    });

    it("should resolve fallback color if dictionary color is missing", () => {
      // Tamamen boş bir sözlük gönderirsek ne olacağını test ediyoruz (Edge case / Sınır durumu).
      const emptyDict = {} as Dictionary;
      const meta = getStatusMeta("SUCCESS", emptyDict);
      expect(meta).toEqual({
        color: "#48BB78",
        paletteKey: "success",
        label: "Success",
      });
    });

    it("should gracefully handle null/undefined status and provide default string response", () => {
      const meta = getStatusMeta(undefined, mockDict);
      expect(meta).toEqual({
        color: "#mockSecondary",
        paletteKey: "secondary",
        label: "-", // undefined geldiğinde hatasız "-" dönmesini bekliyoruz.
      });
    });
  });

  describe("getStatusColor", () => {
    it("should return correct MUI status colors based on NotificationType", () => {
      expect(getStatusColor("SUCCESS" as NotificationType)).toBe("success.main");
      expect(getStatusColor("WARNING" as NotificationType)).toBe("warning.main");
      expect(getStatusColor("ERROR" as NotificationType)).toBe("error.main");
    });

    it("should fallback to info.main for INFO or any notification types", () => {
      expect(getStatusColor("INFO" as NotificationType)).toBe("info.main");
      expect(getStatusColor("UNKNOWN" as NotificationType)).toBe("info.main");
      expect(getStatusColor(undefined as unknown as NotificationType)).toBe("info.main");
    });
  });

  describe("resolveStatusAlpha", () => {
    it("should return correct MUI alpha colors based on NotificationType", () => {
      expect(resolveStatusAlpha("SUCCESS" as NotificationType)).toBe("success._alpha.main_20");
      expect(resolveStatusAlpha("WARNING" as NotificationType)).toBe("warning._alpha.main_20");
      expect(resolveStatusAlpha("ERROR" as NotificationType)).toBe("error._alpha.main_20");
    });

    it("should fallback to info alpha variant for INFO or any notification types", () => {
      expect(resolveStatusAlpha("INFO" as NotificationType)).toBe("info._alpha.main_20");
      expect(resolveStatusAlpha("UNKNOWN" as NotificationType)).toBe("info._alpha.main_20");
      expect(resolveStatusAlpha(undefined as unknown as NotificationType)).toBe("info._alpha.main_20");
    });
  });
});
