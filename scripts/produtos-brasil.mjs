// Gera src/data/produtos-brasil.json: fórmulas chinesas vendidas no Brasil
// (Taimin e TaoZen), com a composição ligada às ervas do app e a fórmula do
// app mais parecida. Guarda só nome, forma, composição (sem doses) e o link
// da loja — sem textos, fotos ou preços das lojas.
//
// Uso: npm run fitoterapia:produtos   (lê os sites de novo; precisa de internet)

import { readFileSync, writeFileSync } from 'node:fs';

const FITO = JSON.parse(readFileSync(new URL('../src/data/fitoterapia.json', import.meta.url), 'utf8'));
const ERVAS = FITO.ervas;
const UA = { 'User-Agent': 'Mozilla/5.0 (app Metodo de Anamnese em MTC; leitura do catalogo)' };
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

// Ervas que não estão no app (aparecem só nos produtos). Avisos importantes
// de segurança e legais; o resto aparece só pelo nome.
// [pinyin, nome, alertas, aviso]
const EXTRAS = {
  'he-shou-wu': ['He Shou Wu', 'Polígono multiflor', ['toxica'], 'Pode causar lesão no fígado (há relatos mesmo na forma preparada): evitar em doença do fígado, pedir exames se o uso for longo.'],
  'han-fang-ji': ['Han Fang Ji', 'Stephania tetrandra', ['toxica'], 'Confundida no comércio com Guang Fang Ji (Aristolochia), que lesa os rins e causa câncer: confirmar com a loja que é Stephania.'],
  'ma-huang': ['Ma Huang', 'Éfedra', ['pressao', 'gest'], 'Contém efedrina (substância controlada pela Anvisa): acelera o coração e sobe a pressão; evitar em cardíacos, hipertensos, ansiedade, glaucoma e gestação. Confirmar com a loja a forma liberada.'],
  'xi-jiao': ['Xi Jiao', 'Chifre de rinoceronte', ['animal'], 'Comércio PROIBIDO (espécie protegida, CITES). Perguntar à loja qual substituto usa (em geral Shui Niu Jiao, chifre de búfalo).'],
  'ling-yang-jiao': ['Ling Yang Jiao', 'Chifre de antílope saiga', ['animal'], 'Espécie ameaçada (CITES): perguntar à loja a origem ou o substituto.'],
  'ying-su-ke': ['Ying Su Ke', 'Casca da papoula', ['toxica', 'gest'], 'Derivado da papoula (opiáceo): substância controlada no Brasil; risco de dependência. Perguntar à loja o que usa no lugar.'],
  'quan-xie': ['Quan Xie', 'Escorpião', ['toxica', 'gest', 'animal'], 'Tóxico: dose baixa e uso curto; proibido na gestação.'],
  'shui-zhi': ['Shui Zhi', 'Sanguessuga', ['gest', 'anticoag', 'animal'], 'Anticoagulante forte: proibido na gestação e com anticoagulantes ou sangramentos.'],
  'zhe-chong': ['Zhe Chong', 'Barata-da-terra', ['toxica', 'gest', 'animal'], 'Levemente tóxico; proibido na gestação.'],
  'chan-tui': ['Chan Tui', 'Muda de cigarra', ['animal'], ''],
  'lu-rong': ['Lu Rong', 'Chifre jovem de cervo', ['animal'], 'Muito quente: evitar com calor ou pressão alta.'],
  'lu-jiao': ['Lu Jiao', 'Chifre de cervo', ['animal'], ''],
  'gui-ban-jiao': ['Gui Ban Jiao', 'Gelatina de casco de tartaruga', ['animal', 'gest'], 'Espécie protegida: usar só de fonte legal.'],
  'zhen-zhu-mu': ['Zhen Zhu Mu', 'Madrepérola', ['mineral'], ''],
  'zi-ran-tong': ['Zi Ran Tong', 'Pirita', ['mineral', 'gest'], 'Mineral: uso curto.'],
  'mang-xiao': ['Mang Xiao', 'Sulfato de sódio', ['mineral', 'gest'], 'Purgante: proibido na gestação.'],
  'lu-hui': ['Lu Hui', 'Babosa (resina)', ['gest'], 'Purgante forte: proibido na gestação e na menstruação.'],
  'cang-er-zi': ['Cang Er Zi', 'Xanthium', ['toxica'], 'Tóxico em dose alta ou uso longo (fígado).'],
  'wu-zhu-yu': ['Wu Zhu Yu', 'Evódia', ['toxica', 'gest'], 'Levemente tóxica: dose baixa.'],
  'xue-jie': ['Xue Jie', 'Sangue-de-dragão', ['gest', 'anticoag'], ''],
  'ru-xiang': ['Ru Xiang', 'Olíbano', ['gest'], ''],
  'mo-yao': ['Mo Yao', 'Mirra', ['gest'], ''],
  'san-qi': ['San Qi', 'Notoginseng', ['gest', 'anticoag'], ''],
  'pu-huang': ['Pu Huang', 'Pólen de taboa', ['gest'], ''],
  'wang-bu-liu-xing': ['Wang Bu Liu Xing', 'Vacária', ['gest'], ''],
  'hai-zao': ['Hai Zao', 'Sargaço', [], 'Rica em iodo: cuidado na tireoide. Classicamente incompatível com Gan Cao.'],
  'kun-bu': ['Kun Bu', 'Alga laminária', [], 'Rica em iodo: cuidado na tireoide.'],
  'bai-dou-kou': ['Bai Dou Kou', 'Cardamomo-redondo', [], ''],
  'fu-pen-zi': ['Fu Pen Zi', 'Framboesa chinesa', [], ''],
};

// Mesma erva com outro nome (nome da loja → id do app).
const ALIAS = {
  'zhi-gan-cao': 'gan-cao', 'yin-chen-hao': 'yin-chen', 'bian-dou': 'bai-bian-dou', 'zhu-ye': 'dan-zhu-ye',
  'gan-jiang': 'sheng-jiang', 'pao-jiang': 'sheng-jiang', 'zhe-bei-mu': 'bei-mu', 'chuan-bei-mu': 'bei-mu',
  'hong-shen': 'ren-shen', 'zhi-shi': 'zhi-ke', 'zhi-qiao': 'zhi-ke', 'fu-zi-zhi': 'fu-zi',
};

// Taimin escreve as ervas em latim farmacêutico. Do mais específico ao geral.
const LATIM = [
  [/Amomi Fructus Rotundus/i, 'bai-dou-kou'], [/Amomi Fructus/i, 'sha-ren'],
  [/Aurantii/i, 'zhi-ke'], [/Ziziphi Spinosae/i, 'suan-zao-ren'], [/Chuanxiong/i, 'chuan-xiong'],
  [/Anemarrhenae/i, 'zhi-mu'], [/Ophiopogonis/i, 'mai-men-dong'], [/Polygoni Multiflori/i, 'he-shou-wu'],
  [/Schisandrae/i, 'wu-wei-zi'], [/Salviae Miltiorrhizae/i, 'dan-shen'], [/^Poria/i, 'fu-ling'],
  [/Codonopsis/i, 'dang-shen'], [/Macrocephalae/i, 'bai-zhu'], [/Glycyrrhizae/i, 'gan-cao'],
  [/Angelicae Sinensis/i, 'dang-gui'], [/Angelicae Dahuricae/i, 'bai-zhi'], [/Paeoniae Radix Alba/i, 'bai-shao'],
  [/Paeoniae Radix Rubra/i, 'chi-shao'], [/Rehmanniae Radix Praeparata/i, 'shu-di-huang'], [/Rehmanniae/i, 'sheng-di-huang'],
  [/Notopterygii/i, 'qiang-huo'], [/Asari/i, 'xi-xin'], [/Saposhnikoviae/i, 'fang-feng'], [/Schizonepetae/i, 'jing-jie'],
  [/Menthae/i, 'bo-he'], [/Leonuri/i, 'yi-mu-cao'], [/Cinnamomi Cortex/i, 'rou-gui'], [/Cinnamomi Ramulus/i, 'gui-zhi'],
  [/Aconiti/i, 'fu-zi'], [/Corni/i, 'shan-zhu-yu'], [/Moutan/i, 'mu-dan-pi'], [/Dioscoreae/i, 'shan-yao'],
  [/Alismatis/i, 'ze-xie'], [/Astragali/i, 'huang-qi'], [/Polygalae/i, 'yuan-zhi'], [/Longan/i, 'long-yan-rou'],
  [/Aucklandiae/i, 'mu-xiang'], [/Jujubae/i, 'da-zao'], [/Persicae/i, 'tao-ren'], [/Lycii/i, 'gou-qi-zi'],
  [/Chrysanthemi/i, 'ju-hua'], [/Artemisiae Scopariae/i, 'yin-chen'], [/Lonicerae/i, 'jin-yin-hua'],
  [/Gardeniae/i, 'zhi-zi'], [/Magnoliae/i, 'hou-po'], [/Stephaniae/i, 'han-fang-ji'], [/Ginseng/i, 'ren-shen'],
  [/Cuscutae/i, 'tu-si-zi'], [/Rubi/i, 'fu-pen-zi'], [/Plantaginis/i, 'che-qian-zi'], [/Citri/i, 'chen-pi'],
  [/Pinelliae/i, 'ban-xia'], [/Cyperi/i, 'xiang-fu'], [/Pogostemonis/i, 'huo-xiang'], [/Zingiberis/i, 'sheng-jiang'],
  [/Bupleuri/i, 'chai-hu'], [/Phellodendri/i, 'huang-bai'],
];

const titulo = (s) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
// Nome-base para comparar fórmulas: "Xiao Yao San" e "XIAOYAO WAN" → "xiaoyao".
const base = (s) => s.toLowerCase().replace(/[^a-z]/g, '').replace(/(wan|tang|san|pian|jiaonang|dan|yin|keli|gao)$/, '');

async function taimin() {
  const out = [];
  for (const page of [1, 2]) {
    const url = 'https://taimin.com.br/medicina-chinesa/produtos' + (page > 1 ? `?page=${page}` : '');
    const html = await (await fetch(url, { headers: UA })).text();
    const t = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<br\s*\/?>/g, '\n')
      .replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n');
    const re = /^ ?([A-Z][A-Z ]+?) - ([\u4e00-\u9fff]+)\s*$/gm;
    const idx = [];
    for (let m; (m = re.exec(t));) idx.push({ i: m.index, nome: m[1].trim(), chines: m[2] });
    idx.forEach((p, k) => {
      const corpo = t.slice(p.i, idx[k + 1]?.i ?? t.length);
      const apresentacao = (corpo.match(/Contém:\s*\n?\s*([^\n]+)/) || [])[1]?.trim() ?? '';
      const linhas = (corpo.split(/Fórmula:/)[1] ?? '').split(/Outros ingredientes|Concentração/)[0].split('\n')
        .map((l) => l.replace(/^\s*\d+\.\s*/, '').trim()).filter((l) => /^[A-Z]/.test(l));
      const ervas = [];
      for (const l of linhas) {
        const hit = LATIM.find(([r]) => r.test(l));
        if (!hit) throw new Error(`Taimin: erva sem correspondência "${l}" em ${p.nome}`);
        if (!ervas.includes(hit[1])) ervas.push(hit[1]);
      }
      const forma = /cápsula/i.test(apresentacao) ? 'cápsulas' : /comprimido/i.test(apresentacao) ? 'comprimidos' : 'pílulas';
      out.push({ loja: 'taimin', nome: titulo(p.nome), chines: p.chines, forma, apresentacao, url, ervas });
    });
    await pausa(1000);
  }
  return out;
}

async function taozen() {
  // Mesmos dados públicos que o próprio site da TaoZen usa para montar as páginas.
  const app = '6a1ebf80bb1d76ac1e1876e8';
  const r = await fetch(`https://taozen.com.br/api/apps/${app}/entities/Formula?limit=1000`, { headers: { ...UA, 'X-App-Id': app } });
  const lista = await r.json();
  return lista.filter((f) => f.disponivel_venda && f.composicao?.length).map((f) => {
    const ervas = [];
    for (const c of f.composicao) {
      const id = ALIAS[c.erva_slug] ?? c.erva_slug;
      if (!ERVAS[id] && !EXTRAS[id]) EXTRAS[id] = [c.erva_nome_pinyin, '', [], ''];
      if (!ervas.includes(id)) ervas.push(id);
    }
    return {
      loja: 'taozen', nome: f.nome_pinyin, chines: f.nome_chines || '', nomePt: f.nome_portugues || '',
      forma: 'ervas para decocção', apresentacao: f.peso_pacote_g ? `pacote de ${f.peso_pacote_g} g (≈ 1 semana)` : '',
      url: `https://taozen.com.br/formulas-classicas/${f.slug}`, ervas,
    };
  });
}

// Fórmula do app que mais se parece com o produto. As ervas que só
// harmonizam (alcaçuz, gengibre, tâmara) aparecem em quase tudo e não contam
// na semelhança. Parecida = pelo menos 3 ervas em comum e metade do conjunto.
const HARMONIZA = new Set(['gan-cao', 'sheng-jiang', 'da-zao']);
function comparar(p) {
  const pe = p.ervas.filter((e) => !HARMONIZA.has(e));
  let best = null;
  for (const f of FITO.formulas) {
    const fe = f.ervas.filter((e) => !HARMONIZA.has(e));
    const comuns = pe.filter((e) => fe.includes(e)).length;
    const jaccard = comuns / (pe.length + fe.length - comuns);
    const mesmoNome = base(f.pinyin) === base(p.nome);
    const nota = jaccard + (mesmoNome ? 1 : 0);
    if (!best || nota > best.nota) best = { f, comuns, jaccard, mesmoNome, nota };
  }
  if (!best) return {};
  const { f, comuns, jaccard, mesmoNome } = best;
  if (!mesmoNome && !(comuns >= 3 && jaccard >= 0.5)) return {};
  return { formula: f.id, relacao: mesmoNome ? 'mesma' : 'parecida' };
}

const produtos = [...await taimin(), ...await taozen()].map((p) => ({ ...p, ...comparar(p) }));
produtos.sort((a, b) => a.nome.localeCompare(b.nome));
produtos.forEach((p, i) => { p.id = `${p.loja}-${i}`; });

const usadas = new Set(produtos.flatMap((p) => p.ervas));
const extras = Object.fromEntries(Object.entries(EXTRAS).filter(([id]) => usadas.has(id) && !ERVAS[id])
  .map(([id, [pinyin, nome, alertas, aviso]]) => [id, { pinyin, nome, alertas, aviso }]));

const out = {
  atualizado: new Date().toISOString().slice(0, 10),
  aviso: 'Lista feita a partir dos catálogos públicos das lojas, só com nome, forma e composição (sem doses). Confira no site da loja a composição atual, a procedência e a situação na Anvisa. As lojas não têm ligação com este app; a lista não é recomendação de marca.',
  lojas: {
    taimin: { nome: 'Taimin', site: 'https://taimin.com.br/medicina-chinesa/produtos', tipo: 'Remédios prontos (cápsulas, pílulas e comprimidos), segundo a Farmacopeia Chinesa', nota: 'Segundo o site: isento de registro sanitário (RDC 901/2024); venda sob prescrição de profissional habilitado.' },
    taozen: { nome: 'TaoZen', site: 'https://taozen.com.br/formulas-classicas', tipo: 'Ervas em pacote para preparar a decocção (chá cozido)', nota: 'Segundo o site: preparo e uso devem seguir a orientação de um profissional habilitado.' },
  },
  extras,
  produtos,
};
writeFileSync(new URL('../src/data/produtos-brasil.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');

const comFormula = produtos.filter((p) => p.formula);
const cobertas = new Set(comFormula.map((p) => p.formula));
console.log(`${produtos.length} produtos (Taimin ${produtos.filter((p) => p.loja === 'taimin').length}, TaoZen ${produtos.filter((p) => p.loja === 'taozen').length})`);
console.log(`${comFormula.filter((p) => p.relacao === 'mesma').length} iguais a uma fórmula do app, ${comFormula.filter((p) => p.relacao === 'parecida').length} parecidas`);
console.log(`${cobertas.size} de ${FITO.formulas.length} fórmulas do app têm produto no Brasil`);
console.log('Sem produto:', FITO.formulas.filter((f) => !cobertas.has(f.id)).map((f) => f.pinyin).join(', '));
