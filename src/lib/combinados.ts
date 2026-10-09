// Padrões combinados (McDonald, Zang Fu Syndromes, cap. VI; Maciocia,
// Fundamentos, "Padrões Combinados" de cada órgão). Não são perguntas
// novas: aparecem quando as síndromes que os formam saem fortes juntas.

export type Combinado = { nome: string; grupos: string[][]; principio: string; formula?: string };

// Cada grupo é "uma destas síndromes"; o padrão aparece quando há uma de cada grupo.
export const COMBINADOS: Combinado[] = [
  { nome: 'Deficiência do Qi do Pulmão e do Baço', grupos: [['DefQiP'], ['DefQiBP', 'DefYgBP']], principio: 'Tonificar o Qi do Pulmão e do Baço (fortalecer a Terra para nutrir o Metal).', formula: 'Liu Jun Zi Tang / Shen Ling Bai Zhu San' },
  { nome: 'Deficiência do Qi do Pulmão e do Coração', grupos: [['DefQiP'], ['DefQiC', 'DefYgC']], principio: 'Tonificar o Qi do Pulmão e do Coração.', formula: 'Bao Yuan Tang' },
  { nome: 'Deficiência do Qi do Pulmão e do Rim', grupos: [['DefQiP'], ['DefQiR', 'RnaoRecQi', 'DefYgR']], principio: 'Tonificar o Pulmão e o Rim e ajudar o Rim a receber o Qi.', formula: 'Ren Shen Hu Tao Tang' },
  { nome: 'Deficiência do Sangue do Coração e do Baço', grupos: [['DefXueC'], ['DefQiBP', 'DefXueBP']], principio: 'Tonificar o Qi do Baço e nutrir o Sangue do Coração.', formula: 'Gui Pi Tang' },
  { nome: 'Deficiência do Sangue do Coração e do Fígado', grupos: [['DefXueC'], ['DefXueF']], principio: 'Nutrir o Sangue do Coração e do Fígado.', formula: 'Si Wu Tang + Suan Zao Ren Tang' },
  { nome: 'Deficiência do Sangue do Baço e do Fígado', grupos: [['DefXueBP', 'DefQiBP'], ['DefXueF']], principio: 'Tonificar o Baço e nutrir o Sangue do Fígado.', formula: 'Ba Zhen Tang' },
  { nome: 'Deficiência do Yin do Fígado e do Rim', grupos: [['DefYnF', 'DefXueF'], ['DefYnR']], principio: 'Nutrir o Yin do Fígado e do Rim.', formula: 'Qi Ju Di Huang Wan / Yi Guan Jian' },
  { nome: 'Desarmonia entre Rim e Coração', grupos: [['DefYnR'], ['DefYnC', 'FgC']], principio: 'Nutrir o Yin do Rim, clarear o Calor do Coração e acalmar o Shen.', formula: 'Tian Wang Bu Xin Dan' },
  { nome: 'Deficiência do Yin do Rim e do Pulmão', grupos: [['DefYnR'], ['DefYnP', 'SecP']], principio: 'Nutrir o Yin do Pulmão e do Rim.', formula: 'Ba Xian Chang Shou Wan' },
  { nome: 'Deficiência do Yang do Rim e do Baço', grupos: [['DefYgR'], ['DefYgBP']], principio: 'Aquecer e tonificar o Yang do Rim e do Baço.', formula: 'Fu Zi Li Zhong Wan / Si Shen Wan' },
  { nome: 'Fogo do Fígado afetando o Pulmão', grupos: [['FgF', 'CalorQiF'], ['CalorP', 'FlmCalorP']], principio: 'Clarear o Fogo do Fígado e fazer descer o Qi do Pulmão.', formula: 'Dai Ge San + Xie Bai San' },
  { nome: 'Umidade no Baço com estagnação do Qi do Fígado', grupos: [['UmdFrioBP', 'UmdCalorBP'], ['EstgQiF', 'FinvBP']], principio: 'Drenar a Umidade, fortalecer o Baço e mover o Qi do Fígado.', formula: 'Ping Wei San + Chai Hu Shu Gan San' },
  { nome: 'Umidade do Baço perturbando o Pulmão', grupos: [['UmdFrioBP', 'DefQiBP'], ['FlmFrioP']], principio: 'Fortalecer o Baço, secar a Umidade e transformar a Fleuma do Pulmão.', formula: 'Er Chen Tang + Liu Jun Zi Tang' },
  { nome: 'Estagnação do Qi e deficiência do Sangue do Fígado', grupos: [['EstgQiF'], ['DefXueF']], principio: 'Mover o Qi do Fígado e nutrir o seu Sangue.', formula: 'Xiao Yao San' },
  { nome: 'Deficiência do Qi do Estômago e do Baço', grupos: [['DefQiE'], ['DefQiBP']], principio: 'Tonificar o Qi do Estômago e do Baço.', formula: 'Si Jun Zi Tang' },
];

// Padrões cujas síndromes estão entre as mais fortes (lista já ordenada).
export function combinadosPresentes(ranked: { code: string; score: number }[], minimo = 2): Combinado[] {
  const fortes = new Set(ranked.slice(0, 6).filter((s) => s.score >= minimo).map((s) => s.code));
  return COMBINADOS.filter((c) => c.grupos.every((g) => g.some((code) => fortes.has(code))));
}
