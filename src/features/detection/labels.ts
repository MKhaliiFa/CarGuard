/** Arabic names for the 80 COCO classes the SSD model was trained on. */
export const COCO_LABELS_AR: Readonly<Record<string, string>> = {
  person: 'شخص', bicycle: 'دراجة', car: 'سيارة', motorcycle: 'دراجة نارية', airplane: 'طائرة', bus: 'حافلة', train: 'قطار',
  truck: 'شاحنة', boat: 'قارب', 'traffic light': 'إشارة مرور', 'fire hydrant': 'حنفية إطفاء', 'stop sign': 'علامة توقف',
  'parking meter': 'عداد موقف', bench: 'مقعد', bird: 'طائر', cat: 'قطة', dog: 'كلب', horse: 'حصان', sheep: 'خروف', cow: 'بقرة',
  elephant: 'فيل', bear: 'دب', zebra: 'حمار وحشي', giraffe: 'زرافة', backpack: 'حقيبة ظهر', umbrella: 'مظلة', handbag: 'حقيبة يد',
  tie: 'ربطة عنق', suitcase: 'حقيبة سفر', frisbee: 'قرص طائر', skis: 'زلاجات', snowboard: 'لوح تزلج', 'sports ball': 'كرة',
  kite: 'طائرة ورقية', 'baseball bat': 'مضرب بيسبول', 'baseball glove': 'قفاز بيسبول', skateboard: 'لوح تزلج بعجلات',
  surfboard: 'لوح ركوب أمواج', 'tennis racket': 'مضرب تنس', bottle: 'زجاجة', 'wine glass': 'كأس', cup: 'كوب', fork: 'شوكة',
  knife: 'سكين', spoon: 'ملعقة', bowl: 'وعاء', banana: 'موزة', apple: 'تفاحة', sandwich: 'شطيرة', orange: 'برتقالة',
  broccoli: 'بروكلي', carrot: 'جزرة', 'hot dog': 'هوت دوج', pizza: 'بيتزا', donut: 'دونات', cake: 'كعكة', chair: 'كرسي',
  couch: 'أريكة', 'potted plant': 'نبتة', bed: 'سرير', 'dining table': 'طاولة', toilet: 'مرحاض', tv: 'شاشة', laptop: 'حاسوب محمول',
  mouse: 'فأرة حاسوب', remote: 'جهاز تحكم', keyboard: 'لوحة مفاتيح', 'cell phone': 'هاتف محمول', microwave: 'ميكروويف',
  oven: 'فرن', toaster: 'محمصة', sink: 'حوض', refrigerator: 'ثلاجة', book: 'كتاب', clock: 'ساعة', vase: 'مزهرية',
  scissors: 'مقص', 'teddy bear': 'دمية دب', 'hair drier': 'مجفف شعر', toothbrush: 'فرشاة أسنان',
}

/** Arabic name when known; otherwise the model's original English class name. */
export function arabicLabel(label: string): string {
  return COCO_LABELS_AR[label] ?? label
}

/**
 * COCO classes that are small electronics — the closest the model gets to "a device".
 * None of them is a GPS tracker or recorder; they only hint that a manual look is worthwhile.
 */
export const ELECTRONIC_CLASSES: ReadonlySet<string> = new Set(['cell phone', 'remote', 'mouse', 'laptop', 'keyboard', 'tv', 'clock'])
