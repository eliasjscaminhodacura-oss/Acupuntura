export type Question = {
  id: string;
  key: string;
  cat: string;
  subcat: string;
  label: string;
  exc_def: string;
  fr_cal: string;
  sup_prof: string;
  syndromes: string[];
};

export type SyndromeInfo = {
  code: string;
  name: string;
  organ: string;
  organ_name: string;
  element: string;
  alma: string;
};

export type ClinicalNote = {
  principio: string;
  pontos: string;
  psicossomatica: string;
};

export type FichaData = {
  categories: Record<string, string>;
  questions: Question[];
  syndromes: Record<string, SyndromeInfo>;
  clinical_notes: Record<string, ClinicalNote>;
};

// chave do item (Question.key) -> marcado (true) ou não
export type Answers = Record<string, boolean>;

export type ScoreResult = {
  syndromeScores: Record<string, number>;
  elementScores: Record<string, number>;
};
