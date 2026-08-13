/**
 * tr-bildirim başlığı ve mesajını belirtilen dile (en/tr) göre düzenli ifadelerle çevirir
 * en-translates the notification title and message into the specified language (en/tr) using regex replacements
 * input (title: string, message: string, lang: string)
 * output ({ title: string, message: string })
 */
export function getLocalizedNotification(
  title: string,
  message: string,
  lang: string
): { title: string; message: string } {
  // Pre-process uppercase enums from DB for both languages
  const enumsTR: Record<string, string> = {
    VEHICLE: "Araç",
    DRIVER: "Sürücü",
    SHIPMENT: "Sevkiyat",
    OTHER: "Diğer",
    TRAILER: "Dorse",
    ROUTINE: "Rutin",
    REPAIR: "Onarım",
    INSPECTION: "Muayene",
    EMERGENCY: "Acil",
  };
  
  const enumsEN: Record<string, string> = {
    VEHICLE: "Vehicle",
    DRIVER: "Driver",
    SHIPMENT: "Shipment",
    OTHER: "Other",
    TRAILER: "Trailer",
    ROUTINE: "Routine",
    REPAIR: "Repair",
    INSPECTION: "Inspection",
    EMERGENCY: "Emergency",
  };

  let processedMessage = message;
  const enumMap = lang === "en" ? enumsEN : enumsTR;
  
  for (const [key, val] of Object.entries(enumMap)) {
    // We use a regex to ensure we only replace the exact uppercase word
    const regex = new RegExp(`\\b${key}\\b`, 'g');
    processedMessage = processedMessage.replace(regex, val);
  }

  if (lang !== "en") return { title, message: processedMessage };

  // Translate Titles
  const titleMap: Record<string, string> = {
    "Yeni Depo Oluşturuldu 🏗️": "New Warehouse Created 🏗️",
    "Depo Yöneticisi Atandınız 👤": "Assigned as Warehouse Manager 👤",
    "Düşük Stok Uyarısı! ⚠️": "Low Stock Alert! ⚠️",
    "Kritik Stok Seviyesi! 🚨": "Critical Stock Level! 🚨",
    "Yeni Araç Atandı! 🚛": "New Vehicle Assigned! 🚛",
    "Araç Bakıma Alındı! ⛔": "Vehicle in Maintenance! ⛔",
    "Bakım Kaydı Oluşturuldu 👨‍🔧": "Maintenance Record Created 👨‍🔧",
    "Kritik Belge Uyarısı! 🚫": "Critical Document Alert! 🚫",
    "Belge Süresi Yaklaşıyor ⏳": "Document Expiry Nearing ⏳",
    "Sorun Üzerinde Çalışılıyor 🛠️": "Issue Being Worked On 🛠️",
    "Sorun Giderildi! ✅": "Issue Resolved! ✅",
    "Yeni Ekip Üyesi! 👋": "New Team Member! 👋",
    "Yeni Sevkiyat Kaydı 📦": "New Shipment Record 📦",
    "Sürücü Atandı 👤": "Driver Assigned 👤",
    "Rota Planlandı 🚛": "Route Planned 🚛",
    "Sevkiyat Teslim Edildi ✅": "Shipment Delivered ✅",
    "Yeni Rota Planlandı 📝": "New Route Planned 📝",
    "Rota Başlatıldı 🚚": "Route Started 🚚",
    "Rota Tamamlandı ✅": "Route Completed ✅",
    "Rota İptal Edildi ⚠️": "Route Cancelled ⚠️",
    "Yeni Bakım Kaydı 👨‍🔧": "New Maintenance Record 👨‍🔧",
    "Bakım Kaydı Silindi 🗑️": "Maintenance Record Deleted 🗑️",
    "Yaklaşan Bakım Uyarısı! ⏳": "Upcoming Maintenance Alert! ⏳",
    "Yeni Sürücü Aramıza Katıldı! 🚛": "New Driver Joined! 🚛",
  };

  let translatedTitle = titleMap[title] || title;

  // If the title wasn't an exact match, try dynamic regex replacements for the title
  if (translatedTitle === title) {
    const titleMatchers = [
      {
        regex: /^(.*) Araç Sorunu Bildirildi!$/,
        replace: "$1 Vehicle Issue Reported!",
      },
    ];

    for (const { regex, replace } of titleMatchers) {
      if (regex.test(title)) {
        translatedTitle = title.replace(regex, replace);
        break;
      }
    }

    // Translate priorities if they are embedded in titles
    translatedTitle = translatedTitle
      .replace("Kritik 🚨", "Critical 🚨")
      .replace("Yüksek Öncelikli ⚠️", "High Priority ⚠️")
      .replace("Orta Öncelikli 🛠️", "Medium Priority 🛠️")
      .replace("Düşük Öncelikli ℹ️", "Low Priority ℹ️")
      .replace("Yeni", "New");
  }

  // Translate Messages using regex matchers
  let translatedMessage = processedMessage;

  const matchers = [
    {
      regex: /^(.*) \(.*\) isimli yeni depo sisteme tanımlandı\.$/,
      replace: "New warehouse $1 added to the system.",
    },
    {
      regex: /^(.*) deposu için yönetici olarak görevlendirildiniz\.$/,
      replace: "You have been assigned as manager for $1 warehouse.",
    },
    {
      regex: /^(.*) \(SKU: .*\) kritik stok seviyesinde kaydedildi\.$/,
      replace: "$1 recorded at critical stock level.",
    },
    {
      regex: /^(.*) \(SKU: .*\) stok seviyesi (.*)'e düştü.*$/,
      replace: "Stock level for $1 dropped to $2.",
    },
    {
      regex: /^(.*) plakalı araç için (.*) arızası bildirildi: (.*)$/,
      replace: "Issue reported for vehicle $1 ($2): $3",
    },
    {
      regex: /^(.*) plakalı araç size atandı\. Yolculuğa başlamaya hazır mısınız\?$/,
      replace: "Vehicle $1 assigned to you. Ready to start?",
    },
    {
      regex: /^(.*) plakalı araç şu an bakım durumunda\.$/,
      replace: "Vehicle $1 is currently in maintenance.",
    },
    {
      regex: /^(.*) plakalı araç bakıma alındı\. Tür: (.*)$/,
      replace: "Vehicle $1 taken into maintenance. Type: $2",
    },
    {
      regex: /^(.*) belgesinin süresi dolmuş! Hemen yenileyiniz\.$/,
      replace: "Document $1 has expired! Please renew immediately.",
    },
    {
      regex: /^(.*) belgesinin süresi 1 ay içinde dolacak\.$/,
      replace: "Document $1 will expire in 1 month.",
    },
    {
      regex: /^(.*) plakalı aracın (.*) arızası için çalışmalar başladı\.$/,
      replace: "Work started on $2 issue for vehicle $1.",
    },
    {
      regex: /^(.*) plakalı aracın (.*) arızası giderildi\.$/,
      replace: "Issue $2 resolved for vehicle $1.",
    },
    {
      regex: /^(.*) ekibe katıldı\. Rol: (.*)$/,
      replace: "$1 joined the team. Role: $2",
    },
    {
      regex: /^(.*) takip numaralı yeni sevkiyat oluşturuldu\.$/,
      replace: "New shipment created with tracking ID $1.",
    },
    {
      regex: /^(.*) numaralı sevkiyata bir sürücü atandı\.$/,
      replace: "Driver assigned to shipment $1.",
    },
    {
      regex: /^(.*) numaralı sevkiyat bir rotaya dahil edildi\.$/,
      replace: "Shipment $1 included in a route.",
    },
    {
      regex: /^(.*) numaralı sevkiyatın durumu (.*) olarak güncellendi\.$/,
      replace: "Status of shipment $1 updated to $2.",
    },
    {
      regex: /^(.*) numaralı sevkiyat başarıyla teslim edildi\.$/,
      replace: "Shipment $1 successfully delivered.",
    },
    {
      regex: /^(.*) numaralı sevkiyat işleme alındı\.$/,
      replace: "Shipment $1 is being processed.",
    },
    {
      regex: /^(.*) numaralı sevkiyat yola çıktı\.$/,
      replace: "Shipment $1 is on the way.",
    },
    {
      regex: /^(.*) numaralı yeni bir rota planlandı\. Sürücü: (.*)\.$/,
      replace: "New route $1 planned. Driver: $2.",
    },
    {
      regex: /^(.*) numaralı rota şu an aktif durumda\. Araç yola çıktı\.$/,
      replace: "Route $1 is now active. Vehicle on the way.",
    },
    {
      regex: /^(.*) numaralı rota başarıyla tamamlandı\. Tüm sevkiyatlar teslim edildi\.$/,
      replace: "Route $1 successfully completed. All shipments delivered.",
    },
    {
      regex: /^(.*) numaralı rota iptal edildi\. Araç müsait durumuna çekildi\.$/,
      replace: "Route $1 cancelled. Vehicle is now available.",
    },
    {
      regex: /^(.*) plakalı araç için (.*) bakımı planlandı\.$/,
      replace: "$2 maintenance planned for vehicle $1.",
    },
    {
      regex: /^(.*) plakalı araca ait (.*) bakımı kaydı sistemden silindi\.$/,
      replace: "$2 maintenance record deleted for vehicle $1.",
    },
    {
      regex: /^(.*) plakalı aracın (.*) bakımı yaklaşıyor.*$/,
      replace: "$2 maintenance for vehicle $1 is approaching.",
    },
    {
      regex: /^(.*) sisteme yeni sürücü olarak eklendi\.$/,
      replace: "$1 added as a new driver.",
    },
    {
      regex: /^(.*) isimli sürücü şu an (.*) durumunda\.$/,
      replace: "Driver $1 is currently in $2 status.",
    },
    {
      regex: /^(.*) isimli belgenin durumu: (.*)\. Lütfen yenileyiniz\.$/,
      replace: "Document $1 status is $2. Please renew.",
    },
  ];

  for (const { regex, replace } of matchers) {
    if (regex.test(message)) {
      translatedMessage = message.replace(regex, replace);
      break;
    }
  }

  // Also translate common status words inside messages
  translatedMessage = translatedMessage
    .replace("İPTAL EDİLDİ", "CANCELLED")
    .replace("GECİKMİŞ", "DELAYED")
    .replace("işleme alındı", "processing started")
    .replace("yola çıktı", "on the way")
    .replace("Atandı", "Assigned")
    .replace("Bekleniyor", "Pending");

  return { title: translatedTitle, message: translatedMessage };
}
