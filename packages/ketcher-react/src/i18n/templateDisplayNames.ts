import i18n from './index';

type TemplateDisplayOptions = {
  group?: string;
};

const FUNCTIONAL_GROUPS = 'Functional Groups';

const AMINO_ACID_NAMES_ZH: Record<string, string> = {
  Alanine: '丙氨酸',
  Arginine: '精氨酸',
  Asparagine: '天冬酰胺',
  'Aspartic acid': '天冬氨酸',
  Cysteine: '半胱氨酸',
  Glutamine: '谷氨酰胺',
  'Glutamic acid': '谷氨酸',
  Glycine: '甘氨酸',
  Histidine: '组氨酸',
  Isoleucine: '异亮氨酸',
  Leucine: '亮氨酸',
  Lysine: '赖氨酸',
  Methionine: '蛋氨酸',
  Phenylalanine: '苯丙氨酸',
  Proline: '脯氨酸',
  Serine: '丝氨酸',
  Threonine: '苏氨酸',
  Tryptophan: '色氨酸',
  Tyrosine: '酪氨酸',
  Valine: '缬氨酸',
};

const SUGAR_NAMES_ZH: Record<string, string> = {
  Allose: '阿洛糖',
  Altrose: '阿卓糖',
  Arabinose: '阿拉伯糖',
  Erythrose: '赤藓糖',
  Erythrulose: '赤藓酮糖',
  Fructose: '果糖',
  Galactose: '半乳糖',
  Glucose: '葡萄糖',
  Gulose: '古洛糖',
  Idose: '艾杜糖',
  Lyxose: '来苏糖',
  Mannose: '甘露糖',
  Psicose: '阿洛酮糖',
  Ribose: '核糖',
  Ribulose: '核酮糖',
  Sorbose: '山梨酮糖',
  Tagatose: '塔格糖',
  Talose: '塔洛糖',
  Threose: '苏糖',
  Xylose: '木糖',
  Xylulose: '木酮糖',
};

const SUGAR_STEM_NAMES_ZH: Record<string, string> = {
  Allo: '阿洛',
  Altro: '阿卓',
  Arabino: '阿拉伯',
  Erythro: '赤藓',
  Fructo: '果',
  Galacto: '半乳',
  Gluco: '葡萄',
  Gulo: '古洛',
  Ido: '艾杜',
  Lyxo: '来苏',
  Manno: '甘露',
  Psico: '阿洛酮',
  Ribo: '核',
  Sorbo: '山梨',
  Tagato: '塔格',
  Talo: '塔洛',
  Threo: '苏',
  Xylo: '木',
};

const HETEROCYCLE_AND_CORE_TEMPLATE_NAMES_ZH: Record<string, string> = {
  '1H-indene': '1H-茚',
  '1_2_3-Oxadiazole': '1,2,3-噁二唑',
  Adenine: '腺嘌呤',
  'Adenosine diphosphate': '腺苷二磷酸',
  'Adenosine monophosphate': '腺苷一磷酸',
  'Adenosine triphosphate': '腺苷三磷酸',
  Adamantane: '金刚烷',
  Anthracene: '蒽',
  Azulene: '薁',
  Benzene: '苯',
  Boat: '船式',
  C20H20: 'C20H20',
  C60: 'C60',
  C80: 'C80',
  Chair: '椅式',
  'Cyclopenta-1,3-diene': '环戊-1,3-二烯',
  Cyclopentadiene: '环戊-1,3-二烯',
  Cubane: '立方烷',
  Cytosine: '胞嘧啶',
  Deoxyribose: '脱氧核糖',
  'Deoxyribose monophosphate': '脱氧核糖一磷酸',
  Dioxane: '1,4-二氧六环',
  Dodecaborate: '十二硼酸根',
  Furan: '呋喃',
  Guanine: '鸟嘌呤',
  Imidazole: '咪唑',
  Indole: '吲哚',
  Isoquinoline: '异喹啉',
  Isoxazole: '异噁唑',
  Morpholine: '吗啉',
  Naphtalene: '萘',
  Oxazole: '噁唑',
  'E-Stilbene': '(E)-1,2-二苯乙烯',
  Phenantrene: '菲',
  'Phenylalanine mustard': '苯丙氨酸氮芥',
  Phthalocyanine: '酞菁',
  Piperazine: '哌嗪',
  Piperidine: '哌啶',
  Porphyrin: '卟啉',
  Prismane: '棱柱烷',
  Purine: '嘌呤',
  Pyran: '吡喃',
  Pyrazine: '吡嗪',
  Pyrazol: '吡唑',
  Pyrene: '芘',
  Pyridazine: '哒嗪',
  Pyridine: '吡啶',
  Pyridone: '吡啶酮',
  Pyrimidine: '嘧啶',
  Pyrole: '吡咯',
  Pyrone: '吡喃酮',
  Pyrrolidine: '吡咯烷',
  Quinoline: '喹啉',
  Ribose: '核糖',
  'Ribose monophosphate': '核糖一磷酸',
  Tetrahydrofuran: '四氢呋喃',
  Tetrahydrothiophene: '四氢噻吩',
  Tetrazole: '四唑',
  Thiophene: '噻吩',
  Thymine: '胸腺嘧啶',
  Triazine: '三嗪',
  Triazole: '三唑',
  Triphenylene: '三亚苯',
  Triptycene: '三蝶烯',
  Twistane: '扭曲烷',
  Uracil: '尿嘧啶',
  'Z-Stilbene': '(Z)-1,2-二苯乙烯',
  adamantane: '金刚烷',
  cubane: '立方烷',
  'fullerene C60': '富勒烯 C60',
  sucrose: '蔗糖',
};

const QUALIFIED_TEMPLATE_BASE_NAMES_ZH: Record<string, string> = {
  'Chlorophyll A': '叶绿素A',
  Ferrocene: '二茂铁',
  'Heptamolybdate ion': '七钼酸根离子',
  'Iron pentacarbonyl': '五羰基铁',
  'Tetracobalt dodecacarbonyl': '十二羰基四钴',
  'Vitamin B12': '维生素 B12',
  'bis(benzene)chromium': '双(苯)铬',
};

const QUALIFIER_NAMES_ZH: Record<string, string> = {
  covalent: '共价型',
  dative: '配位型',
  haptic: '多中心配位型',
};

const FUNCTIONAL_GROUP_DISPLAY_NAMES_ZH_EN: Record<string, string> = {
  Ac: '乙酰基 Acetyl',
  Bn: '苄基 Benzyl',
  Boc: '叔丁氧羰基 tert-Butoxycarbonyl',
  Bu: '丁基 Butyl',
  Bz: '苯甲酰基 Benzoyl',
  C2H5: '乙基 Ethyl',
  CCl3: '三氯甲基 Trichloromethyl',
  Cbz: '苄氧羰基 Benzyloxycarbonyl',
  CF3: '三氟甲基 Trifluoromethyl',
  CN: '氰基 Cyano',
  CO2Et: '乙氧羰基 Ethoxycarbonyl',
  CO2H: '羧基 Carboxyl',
  CO2Me: '甲氧羰基 Methoxycarbonyl',
  CO2Pr: '丙氧羰基 Propoxycarbonyl',
  CO2tBu: '叔丁氧羰基 tert-Butoxycarbonyl',
  CONH2: '氨基甲酰基 Carbamoyl',
  CPh3: '三苯甲基 Trityl',
  Cp: '环戊二烯基 Cyclopentadienyl',
  Cy: '环己基 Cyclohexyl',
  Et: '乙基 Ethyl',
  FMOC: '芴甲氧羰基 Fluorenylmethoxycarbonyl',
  Indole: '吲哚基 Indole',
  Me: '甲基 Methyl',
  Mes: '均三甲苯基 Mesityl',
  Ms: '甲磺酰基 Methanesulfonyl',
  NCO: '异氰酸酯基 Isocyanato',
  NCS: '异硫氰酸酯基 Isothiocyanato',
  NHPh: '苯氨基 Anilino',
  NO2: '硝基 Nitro',
  OAc: '乙酰氧基 Acetyloxy',
  OCF3: '三氟甲氧基 Trifluoromethoxy',
  OCN: '氰酸酯基 Cyanato',
  OEt: '乙氧基 Ethoxy',
  OMe: '甲氧基 Methoxy',
  PO2: '膦酰基 Phosphoryl',
  PO3: '膦酸基 Phosphonate',
  PO3H2: '膦酸基 Phosphonic acid',
  PO4: '磷酸基 Phosphate',
  PO4H2: '磷酸基 Phosphoric acid',
  Ph: '苯基 Phenyl',
  PhCOOH: '苯甲酸基 Benzoic acid',
  Piv: '特戊酰基 Pivaloyl',
  Pr: '丙基 Propyl',
  SCN: '硫氰酸酯基 Thiocyanato',
  SO2: '磺酰基 Sulfonyl',
  SO2Cl: '磺酰氯基 Sulfonyl chloride',
  SO2H: '亚磺酸基 Sulfinic acid',
  SO3: '磺酸基 Sulfonate',
  SO3H: '磺酸基 Sulfonic acid',
  SO4: '硫酸基 Sulfate',
  SO4H: '氢硫酸基 Hydrogen sulfate',
  TBDMS: '叔丁基二甲基硅基 tert-Butyldimethylsilyl',
  TBDPS: '叔丁基二苯基硅基 tert-Butyldiphenylsilyl',
  TMS: '三甲基硅基 Trimethylsilyl',
  Tf: '三氟甲磺酰基 Triflyl',
  Tos: '对甲苯磺酰基 p-Toluenesulfonyl',
  Ts: '对甲苯磺酰基 p-Toluenesulfonyl',
  iBu: '异丁基 Isobutyl',
  iPr: '异丙基 Isopropyl',
  sBu: '仲丁基 sec-Butyl',
  ster: '位阻基 Steric group',
  tBu: '叔丁基 tert-Butyl',
};

const SALTS_AND_SOLVENTS_NAMES_ZH: Record<string, string> = {
  '1,2,4-trichlorobenzene': '1,2,4-三氯苯',
  '1,2-dichlorobenzene': '1,2-二氯苯',
  '1,2-dichloroethane': '1,2-二氯乙烷',
  '1,2-dimethoxyethane': '1,2-二甲氧基乙烷',
  '1,2-propanediol': '丙烷-1,2-二醇',
  '1,3-propanediol': '丙烷-1,3-二醇',
  '1,4-butanediol': '丁烷-1,4-二醇',
  '1,4-dioxane': '1,4-二氧六环',
  '1,5-diazabicyclo[5.4.0]undec-7-ene': '1,5-二氮杂双环[5.4.0]十一碳-7-烯',
  '1-butanol': '丁烷-1-醇',
  '1-propanol': '丙烷-1-醇',
  '2,2,2-trifluoroethanol': '2,2,2-三氟乙醇',
  '2,3,4-trifluorotoluene': '2,3,4-三氟甲苯',
  '2-butanol': '丁烷-2-醇',
  '2-ethylhexanol': '2-乙基己醇',
  '2-methoxyethanol': '2-甲氧基乙醇',
  '2-methyl tetrahydrofuran': '2-甲基四氢呋喃',
  '2-methylpentane': '2-甲基戊烷',
  '2-pentanol': '戊烷-2-醇',
  '2-pentanone': '戊烷-2-酮',
  '3-pentanone': '戊烷-3-酮',
  'Ammonium-sulfate': '硫酸铵',
  DIPEA: 'N,N-二异丙基乙胺',
  'Disodium EDTA': '乙二胺四乙酸二钠',
  'Disodium phosphate': '磷酸氢二钠',
  'Guanidine HCl': '盐酸胍',
  'Lithium-chloride': '氯化锂',
  'Monopotassium phosphate': '磷酸二氢钾',
  'Potassium-chloride': '氯化钾',
  'Sodium-acetate': '乙酸钠',
  'Sodium-chloride': '氯化钠',
  TRIS: '三(羟甲基)氨基甲烷',
  'TRIS HCl': '三(羟甲基)氨基甲烷盐酸盐',
  'acetic acid': '乙酸',
  'acetic anhydride': '乙酸酐',
  acetone: '丙酮',
  acetonitrile: '乙腈',
  'amyl acetate': '乙酸戊酯',
  anisole: '甲氧基苯',
  benzene: '苯',
  'benzyl alcohol': '苄醇',
  'butyl acetate': '乙酸丁酯',
  'butyl carbitol': '二甘醇丁醚',
  'carbon dioxide': '二氧化碳',
  'carbon disulfide': '二硫化碳',
  'carbon tetrachloride': '四氯化碳',
  'chloroacetic acid': '氯乙酸',
  chlorobenzene: '氯苯',
  chloroform: '三氯甲烷',
  'cis-decalin': '顺式十氢萘',
  cumene: '异丙苯',
  cyclohexane: '环己烷',
  cyclohexanol: '环己醇',
  cyclohexanone: '环己酮',
  cyclopentanone: '环戊酮',
  'cyclopentyl methyl ether': '环戊基甲醚',
  'dibutyl ether': '二丁醚',
  dichloromethane: '二氯甲烷',
  'diethyl ether': '乙醚',
  'diethylene glycol': '二甘醇',
  'diethylene glycol dimethyl ether': '二甘醇二甲醚',
  diglyme: '二甘醇二甲醚',
  'diisopropyl ether': '二异丙醚',
  'dimethyl acetamide': 'N,N-二甲基乙酰胺',
  'dimethyl carbonate': '碳酸二甲酯',
  'dimethyl ether': '二甲醚',
  'dimethyl formamide': 'N,N-二甲基甲酰胺',
  'dimethyl sulfoxide': '二甲基亚砜',
  'dimethylpropylene urea': "N,N'-二甲基丙撑脲",
  'diphenyl ether': '二苯醚',
  ethanol: '乙醇',
  ethoxybenzene: '乙氧基苯',
  'ethyl acetate': '乙酸乙酯',
  'ethyl formate': '甲酸乙酯',
  'ethyl lactate': '乳酸乙酯',
  'ethyl propionate': '丙酸乙酯',
  'ethylene carbonate': '碳酸乙烯酯',
  'ethylene glycol': '乙二醇',
  fluorobenzene: '氟苯',
  formamide: '甲酰胺',
  'formic acid': '甲酸',
  glycerol: '丙三醇',
  'heavy water': '重水',
  heptane: '庚烷',
  hexamethylphosphoramide: '六甲基磷酰三胺',
  'hexamethylphosphorous triamide': '六甲基亚磷酰三胺',
  hexane: '己烷',
  'isoamyl alcohol': '异戊醇',
  isobutanol: '异丁醇',
  'isobutyl acetate': '乙酸异丁酯',
  isooctane: '异辛烷',
  isopropanol: '丙烷-2-醇',
  'isopropyl acetate': '乙酸异丙酯',
  'm-xylene': '间二甲苯',
  mesitylene: '1,3,5-三甲苯',
  'methane sulphonic acid': '甲磺酸',
  methanol: '甲醇',
  'methyl acetate': '乙酸甲酯',
  'methyl ethyl ketone': '丁烷-2-酮',
  'methyl formate': '甲酸甲酯',
  'methyl isobutyl ketone': '4-甲基-2-戊酮',
  'methyl lactate': '乳酸甲酯',
  'methyl t-butyl ether': '甲基叔丁基醚',
  methylcyclohexane: '甲基环己烷',
  methylcyclopentane: '甲基环戊烷',
  'n,n-diisopropylethylamine': 'N,N-二异丙基乙胺',
  'n,n-dimethylaniline': 'N,N-二甲基苯胺',
  'n-methyl-2-pyrrolidone': 'N-甲基-2-吡咯烷酮',
  'n-methylformamide': 'N-甲基甲酰胺',
  'n-octylacetate': '乙酸正辛酯',
  nitromethane: '硝基甲烷',
  'o-xylene': '邻二甲苯',
  'p-xylene': '对二甲苯',
  pentane: '戊烷',
  'perfluorocyclic ether': '全氟环醚',
  perfluorocyclohexane: '全氟环己烷',
  perfluorohexane: '全氟己烷',
  perfluorotoluene: '全氟甲苯',
  'propane nitrile': '丙腈',
  'propionic acid': '丙酸',
  'propyl acetate': '乙酸丙酯',
  'propylene carbonate': '碳酸丙烯酯',
  pyridine: '吡啶',
  sulfolane: '环丁砜',
  't-amyl methyl ether': '甲基叔戊基醚',
  't-butanol': '叔丁醇',
  't-butyl acetate': '乙酸叔丁酯',
  't-butylethyl ether': '叔丁基乙醚',
  tetrahydrofuran: '四氢呋喃',
  toluene: '甲苯',
  'trichloroacetic acid': '三氯乙酸',
  trichloroacetonitrile: '三氯乙腈',
  triethylamine: '三乙胺',
  'triethylene glycol': '三甘醇',
  'trifluoroacetic acid': '三氟乙酸',
  trifluoromethylbenzene: '三氟甲基苯',
  water: '水',
};

const HETEROCYCLE_AND_RING_GROUPS_ZH: Record<string, string> = {
  '3D Templates': '3D 模板',
};

const ALKANE_NAMES_ZH: Record<string, string> = {
  pentane: '戊烷',
  hexane: '己烷',
  heptane: '庚烷',
  octane: '辛烷',
  nonane: '壬烷',
  decane: '癸烷',
  undecane: '十一烷',
  dodecane: '十二烷',
  tridecane: '十三烷',
};

const getCurrentLocale = () =>
  i18n.resolvedLanguage || i18n.language || i18n.languages?.[0] || '';

const isChineseLocale = () => getCurrentLocale().toLowerCase().startsWith('zh');

const normalizeTemplateName = (name: string) =>
  name.replace(/\u00a0/g, ' ').trim();

const translateSugarName = (name: string): string | undefined => {
  const openChainMatch = name.match(/^(D|L)-([A-Za-z]+)$/);
  if (openChainMatch) {
    const [, chirality, sugarName] = openChainMatch;
    const sugarZh = SUGAR_NAMES_ZH[sugarName];

    if (sugarZh) {
      return `${chirality}-${sugarZh}`;
    }
  }

  const cyclicMatch = name.match(
    /^(alpha|beta)-(D|L)-([A-Za-z]+?)(furanose|pyranose)$/,
  );
  if (cyclicMatch) {
    const [, anomer, chirality, sugarStem, ringType] = cyclicMatch;
    const sugarStemZh = SUGAR_STEM_NAMES_ZH[sugarStem];
    const anomerZh = anomer === 'alpha' ? 'α' : 'β';
    const ringTypeZh = ringType === 'furanose' ? '呋喃糖' : '吡喃糖';

    if (sugarStemZh) {
      return `${anomerZh}-${chirality}-${sugarStemZh}${ringTypeZh}`;
    }
  }

  return undefined;
};

const translateAminoAcidName = (name: string): string | undefined => {
  const glycineMatch = name.match(/^([A-Z]{3})-(Glycine)$/);
  if (glycineMatch) {
    const [, , aminoAcid] = glycineMatch;
    return AMINO_ACID_NAMES_ZH[aminoAcid];
  }

  const match = name.match(/^([A-Z]{3})-(D|L)-(.+)$/);
  if (!match) return undefined;

  const [, , chirality, aminoAcid] = match;
  const aminoAcidZh = AMINO_ACID_NAMES_ZH[aminoAcid];

  return aminoAcidZh ? `${chirality}-${aminoAcidZh}` : undefined;
};

const translateBicycloName = (name: string): string | undefined => {
  const match = name.match(/^Bicyclo\[([0-9-]+)\](.+)$/);
  if (!match) return undefined;

  const [, bridge, alkane] = match;
  const alkaneZh = ALKANE_NAMES_ZH[alkane];

  return alkaneZh ? `双环[${bridge.replace(/-/g, '.')}]${alkaneZh}` : undefined;
};

const translateRingName = (name: string): string | undefined => {
  const ringMatch = name.match(/^Ring(\d+)$/);
  if (ringMatch) {
    return `${ringMatch[1]}元环`;
  }

  const chairVariantMatch = name.match(/^Chair(\d+)$/);
  if (chairVariantMatch) {
    return `椅式${chairVariantMatch[1]}`;
  }

  const conformerMatch = name.match(/^ring 6 (boat|chair)$/);
  if (conformerMatch) {
    return `六元环${conformerMatch[1] === 'boat' ? '船式' : '椅式'}`;
  }

  return undefined;
};

const translateCrownOrAnnuleneName = (name: string): string | undefined => {
  const crownMatch = name.match(/^(\d+)-Crown-(\d+)$/);
  if (crownMatch) {
    return `${crownMatch[1]}-冠-${crownMatch[2]}`;
  }

  const annuleneMatch = name.match(/^(\d+)-Annulene$/);
  if (annuleneMatch) {
    return `[${annuleneMatch[1]}]轮烯`;
  }

  return undefined;
};

const translateQualifiedTemplateName = (name: string): string | undefined => {
  const match = name.match(/^(.*)_(covalent|dative|haptic)$/);
  if (!match) return undefined;

  const [, baseName, qualifier] = match;
  const baseNameZh = QUALIFIED_TEMPLATE_BASE_NAMES_ZH[baseName];
  const qualifierZh = QUALIFIER_NAMES_ZH[qualifier];

  return baseNameZh && qualifierZh
    ? `${baseNameZh}（${qualifierZh}）`
    : undefined;
};

export const getLocalizedTemplateGroupName = (
  group?: string,
): string | undefined => {
  if (!group || !isChineseLocale()) return undefined;
  return HETEROCYCLE_AND_RING_GROUPS_ZH[group];
};

export const getLocalizedTemplateName = (
  name?: string,
  options?: TemplateDisplayOptions,
): string | undefined => {
  if (!name || !isChineseLocale()) {
    return undefined;
  }

  const normalizedName = normalizeTemplateName(name);

  if (options?.group === FUNCTIONAL_GROUPS) {
    return FUNCTIONAL_GROUP_DISPLAY_NAMES_ZH_EN[normalizedName];
  }

  return (
    SALTS_AND_SOLVENTS_NAMES_ZH[normalizedName] ||
    HETEROCYCLE_AND_CORE_TEMPLATE_NAMES_ZH[normalizedName] ||
    translateSugarName(normalizedName) ||
    translateAminoAcidName(normalizedName) ||
    translateBicycloName(normalizedName) ||
    translateRingName(normalizedName) ||
    translateCrownOrAnnuleneName(normalizedName) ||
    translateQualifiedTemplateName(normalizedName)
  );
};
