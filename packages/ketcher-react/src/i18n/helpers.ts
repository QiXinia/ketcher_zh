import i18n from './index';
import {
  getLocalizedTemplateGroupName,
  getLocalizedTemplateName,
} from './templateDisplayNames';

const TEMPLATE_NAME_KEYS: Record<string, string> = {
  Benzene: 'templates.names.benzene',
  Cyclopentadiene: 'templates.names.cyclopentadiene',
  Cyclohexane: 'templates.names.cyclohexane',
  Cyclopentane: 'templates.names.cyclopentane',
  Cyclopropane: 'templates.names.cyclopropane',
  Cyclobutane: 'templates.names.cyclobutane',
  Cycloheptane: 'templates.names.cycloheptane',
  Cyclooctane: 'templates.names.cyclooctane',
};

const TEMPLATE_GROUP_KEYS: Record<string, string> = {
  'Functional Groups': 'functionalGroups.title',
  'Salts and Solvents': 'templates.saltsAndSolvents',
  'User Templates': 'templates.userTemplates',
  'alpha-D-Sugars': 'templates.groups.alphaDSugars',
  Aromatics: 'templates.groups.aromatics',
  'beta-D-Sugars': 'templates.groups.betaDSugars',
  Bicycles: 'templates.groups.bicycles',
  'Bridged Polycyclics': 'templates.groups.bridgedPolycyclics',
  'Crown Ethers': 'templates.groups.crownEthers',
  'D-Amino Acids': 'templates.groups.dAminoAcids',
  'D-Sugars': 'templates.groups.dSugars',
  'Heterocyclic Rings': 'templates.groups.heterocyclicRings',
  'L-Amino Acids': 'templates.groups.lAminoAcids',
  Nucleobases: 'templates.groups.nucleobases',
  Rings: 'templates.groups.rings',
  Sugars: 'templates.groups.sugars',
};

const GENERIC_GROUP_KEYS: Record<string, string> = {
  'Atom Generics': 'extendedTable.atomGenerics',
  'Special Nodes': 'extendedTable.specialNodes',
  'Group Generics': 'extendedTable.groupGenerics',
  Acyclic: 'extendedTable.acyclic',
  Cyclic: 'extendedTable.cyclic',
  'Acyclic Carbo': 'extendedTable.acyclicCarbo',
  'Acyclic Hetero': 'extendedTable.acyclicHetero',
  'Cyclic Carbo': 'extendedTable.cyclicCarbo',
  'Cyclic Hetero': 'extendedTable.cyclicHetero',
  'any atom': 'extendedTable.anyAtom',
  'except C or H': 'extendedTable.exceptCOrH',
  'any metal': 'extendedTable.anyMetal',
  'any halogen': 'extendedTable.anyHalogen',
  'no carbon': 'extendedTable.noCarbon',
  alkynyl: 'extendedTable.alkynyl',
  alkyl: 'extendedTable.alkyl',
  alkenyl: 'extendedTable.alkenyl',
  aryl: 'extendedTable.aryl',
  cycloalkyl: 'extendedTable.cycloalkyl',
  cycloalkenyl: 'extendedTable.cycloalkenyl',
  'hetero aryl': 'extendedTable.heteroAryl',
};

const BOND_TITLE_KEYS: Record<string, string> = {
  single: 'bond.single',
  up: 'bond.up',
  down: 'bond.down',
  updown: 'bond.updown',
  double: 'bond.double',
  crossed: 'bond.crossed',
  triple: 'bond.triple',
  aromatic: 'bond.aromatic',
  any: 'bond.any',
  hydrogen: 'bond.hydrogen',
  singledouble: 'bond.singleDouble',
  singlearomatic: 'bond.singleAromatic',
  doublearomatic: 'bond.doubleAromatic',
  dative: 'bond.dative',
};

const ELEMENT_TITLES: Record<string, { en: string; zh: string }> = {
  H: { en: 'Hydrogen', zh: '氢' },
  He: { en: 'Helium', zh: '氦' },
  Li: { en: 'Lithium', zh: '锂' },
  Be: { en: 'Beryllium', zh: '铍' },
  B: { en: 'Boron', zh: '硼' },
  C: { en: 'Carbon', zh: '碳' },
  N: { en: 'Nitrogen', zh: '氮' },
  O: { en: 'Oxygen', zh: '氧' },
  F: { en: 'Fluorine', zh: '氟' },
  Ne: { en: 'Neon', zh: '氖' },
  Na: { en: 'Sodium', zh: '钠' },
  Mg: { en: 'Magnesium', zh: '镁' },
  Al: { en: 'Aluminium', zh: '铝' },
  Si: { en: 'Silicon', zh: '硅' },
  P: { en: 'Phosphorus', zh: '磷' },
  S: { en: 'Sulfur', zh: '硫' },
  Cl: { en: 'Chlorine', zh: '氯' },
  Ar: { en: 'Argon', zh: '氩' },
  K: { en: 'Potassium', zh: '钾' },
  Ca: { en: 'Calcium', zh: '钙' },
  Sc: { en: 'Scandium', zh: '钪' },
  Ti: { en: 'Titanium', zh: '钛' },
  V: { en: 'Vanadium', zh: '钒' },
  Cr: { en: 'Chromium', zh: '铬' },
  Mn: { en: 'Manganese', zh: '锰' },
  Fe: { en: 'Iron', zh: '铁' },
  Co: { en: 'Cobalt', zh: '钴' },
  Ni: { en: 'Nickel', zh: '镍' },
  Cu: { en: 'Copper', zh: '铜' },
  Zn: { en: 'Zinc', zh: '锌' },
  Ga: { en: 'Gallium', zh: '镓' },
  Ge: { en: 'Germanium', zh: '锗' },
  As: { en: 'Arsenic', zh: '砷' },
  Se: { en: 'Selenium', zh: '硒' },
  Br: { en: 'Bromine', zh: '溴' },
  Kr: { en: 'Krypton', zh: '氪' },
  Rb: { en: 'Rubidium', zh: '铷' },
  Sr: { en: 'Strontium', zh: '锶' },
  Y: { en: 'Yttrium', zh: '钇' },
  Zr: { en: 'Zirconium', zh: '锆' },
  Nb: { en: 'Niobium', zh: '铌' },
  Mo: { en: 'Molybdenum', zh: '钼' },
  Tc: { en: 'Technetium', zh: '锝' },
  Ru: { en: 'Ruthenium', zh: '钌' },
  Rh: { en: 'Rhodium', zh: '铑' },
  Pd: { en: 'Palladium', zh: '钯' },
  Ag: { en: 'Silver', zh: '银' },
  Cd: { en: 'Cadmium', zh: '镉' },
  In: { en: 'Indium', zh: '铟' },
  Sn: { en: 'Tin', zh: '锡' },
  Sb: { en: 'Antimony', zh: '锑' },
  Te: { en: 'Tellurium', zh: '碲' },
  I: { en: 'Iodine', zh: '碘' },
  Xe: { en: 'Xenon', zh: '氙' },
  Cs: { en: 'Caesium', zh: '铯' },
  Ba: { en: 'Barium', zh: '钡' },
  La: { en: 'Lanthanum', zh: '镧' },
  Ce: { en: 'Cerium', zh: '铈' },
  Pr: { en: 'Praseodymium', zh: '镨' },
  Nd: { en: 'Neodymium', zh: '钕' },
  Pm: { en: 'Promethium', zh: '钷' },
  Sm: { en: 'Samarium', zh: '钐' },
  Eu: { en: 'Europium', zh: '铕' },
  Gd: { en: 'Gadolinium', zh: '钆' },
  Tb: { en: 'Terbium', zh: '铽' },
  Dy: { en: 'Dysprosium', zh: '镝' },
  Ho: { en: 'Holmium', zh: '钬' },
  Er: { en: 'Erbium', zh: '铒' },
  Tm: { en: 'Thulium', zh: '铥' },
  Yb: { en: 'Ytterbium', zh: '镱' },
  Lu: { en: 'Lutetium', zh: '镥' },
  Hf: { en: 'Hafnium', zh: '铪' },
  Ta: { en: 'Tantalum', zh: '钽' },
  W: { en: 'Tungsten', zh: '钨' },
  Re: { en: 'Rhenium', zh: '铼' },
  Os: { en: 'Osmium', zh: '锇' },
  Ir: { en: 'Iridium', zh: '铱' },
  Pt: { en: 'Platinum', zh: '铂' },
  Au: { en: 'Gold', zh: '金' },
  Hg: { en: 'Mercury', zh: '汞' },
  Tl: { en: 'Thallium', zh: '铊' },
  Pb: { en: 'Lead', zh: '铅' },
  Bi: { en: 'Bismuth', zh: '铋' },
  Po: { en: 'Polonium', zh: '钋' },
  At: { en: 'Astatine', zh: '砹' },
  Rn: { en: 'Radon', zh: '氡' },
  Fr: { en: 'Francium', zh: '钫' },
  Ra: { en: 'Radium', zh: '镭' },
  Ac: { en: 'Actinium', zh: '锕' },
  Th: { en: 'Thorium', zh: '钍' },
  Pa: { en: 'Protactinium', zh: '镤' },
  U: { en: 'Uranium', zh: '铀' },
  Np: { en: 'Neptunium', zh: '镎' },
  Pu: { en: 'Plutonium', zh: '钚' },
  Am: { en: 'Americium', zh: '镅' },
  Cm: { en: 'Curium', zh: '锔' },
  Bk: { en: 'Berkelium', zh: '锫' },
  Cf: { en: 'Californium', zh: '锎' },
  Es: { en: 'Einsteinium', zh: '锿' },
  Fm: { en: 'Fermium', zh: '镄' },
  Md: { en: 'Mendelevium', zh: '钔' },
  No: { en: 'Nobelium', zh: '锘' },
  Lr: { en: 'Lawrencium', zh: '铹' },
  Rf: { en: 'Rutherfordium', zh: '𬬻' },
  Db: { en: 'Dubnium', zh: '𬭊' },
  Sg: { en: 'Seaborgium', zh: '𬭳' },
  Bh: { en: 'Bohrium', zh: '𬭛' },
  Hs: { en: 'Hassium', zh: '𬭶' },
  Mt: { en: 'Meitnerium', zh: '鿏' },
  Ds: { en: 'Darmstadtium', zh: '𫟼' },
  Rg: { en: 'Roentgenium', zh: '𬬭' },
  Cn: { en: 'Copernicium', zh: '鿔' },
  Nh: { en: 'Nihonium', zh: '鿭' },
  Fl: { en: 'Flerovium', zh: '𫓧' },
  Mc: { en: 'Moscovium', zh: '镆' },
  Lv: { en: 'Livermorium', zh: '鿬' },
  Ts: { en: 'Tennessine', zh: '鿫' },
  Og: { en: 'Oganesson', zh: '鿬气' },
};

export const getTemplateDisplayName = (name?: string): string => {
  if (!name) return '';
  const localizedName = getLocalizedTemplateName(name);
  if (localizedName) return localizedName;

  const key = TEMPLATE_NAME_KEYS[name];
  return key ? i18n.t(key) : name;
};

export const getTemplateGroupDisplayName = (group?: string): string => {
  if (!group) return '';
  const localizedGroupName = getLocalizedTemplateGroupName(group);
  if (localizedGroupName) return localizedGroupName;

  const key = TEMPLATE_GROUP_KEYS[group];
  return key ? i18n.t(key) : group;
};

export const getTemplateDisplayNameByGroup = (
  name?: string,
  group?: string,
): string => {
  if (!name) return '';
  const localizedName = getLocalizedTemplateName(name, { group });
  return localizedName || getTemplateDisplayName(name);
};

export const getGenericGroupDisplayName = (group?: string): string => {
  if (!group) return '';
  const key = GENERIC_GROUP_KEYS[group];
  return key ? i18n.t(key) : group;
};

export const getBondDisplayTitle = (type?: string): string => {
  if (!type) return '';
  const key = BOND_TITLE_KEYS[type];
  return key ? i18n.t(key) : type;
};

export const getElementDisplayTitle = (
  label?: string,
  fallbackTitle?: string,
): string => {
  if (!label) return fallbackTitle || '';
  const entry = ELEMENT_TITLES[label];
  if (!entry) {
    return fallbackTitle || label;
  }

  return i18n.resolvedLanguage?.startsWith('zh') ? entry.zh : entry.en;
};
