// Gera src/data/fitoterapia.json (Fitoterapia Chinesa): ervas, fórmulas
// clássicas e a ligação síndrome da ficha → fórmulas. Conteúdo montado a
// partir das fórmulas clássicas (Shang Han Lun, Jin Gui Yao Lue, He Ji Ju Fang
// e outras) e da literatura geral de MTC, resumido com nossas palavras.
// Sem doses: a dosagem é decisão do terapeuta. Conteúdo a ser revisado.
//
// Uso: node scripts/fitoterapia-dados.mjs

import { writeFileSync } from 'node:fs';

// Natureza: Q quente, M morno, N neutro, F fresco, Fr frio.
// Alertas: gest (evitar na gestação), anticoag (interage com anticoagulantes),
// pressao (cuidado na pressão alta), toxica (tóxica/só preparada/dose baixa),
// animal (origem animal), mineral (mineral/concha).
const NAT = { Q: 'Quente', M: 'Morno', N: 'Neutro', F: 'Fresco', Fr: 'Frio' };
// [id, pinyin, nome popular, nome latino, natureza, sabores, meridianos, ações, cuidados, alertas]
const E = [
  // Tonificam o Qi
  ['ren-shen', 'Ren Shen', 'Ginseng', 'Ginseng Radix', 'M', 'doce, levemente amargo', 'BP, P, C', 'Tonifica fortemente o Qi original, o Baço e o Pulmão; acalma o Shen; gera líquidos.', 'Evitar na pressão alta não controlada, insônia por excesso e calor; pode interagir com anticoagulantes e hipoglicemiantes. Dang Shen é o substituto mais suave e barato.', ['pressao', 'anticoag']],
  ['dang-shen', 'Dang Shen', 'Codonopsis', 'Codonopsis Radix', 'N', 'doce', 'BP, P', 'Tonifica o Qi do Baço e do Pulmão; substituto suave do Ginseng.', '', []],
  ['huang-qi', 'Huang Qi', 'Astrágalo', 'Astragali Radix', 'M', 'doce', 'BP, P', 'Tonifica o Qi e eleva o Yang; fortalece o Qi defensivo (imunidade); drena edema; ajuda a cicatrizar.', 'Evitar em excesso, calor e na fase aguda de infecções.', []],
  ['bai-zhu', 'Bai Zhu', 'Atractilódio branco', 'Atractylodis macrocephalae Rhizoma', 'M', 'amargo, doce', 'BP, E', 'Tonifica o Baço, seca a umidade, controla a transpiração; acalma o feto.', 'Cuidado na deficiência de Yin com sede.', []],
  ['shan-yao', 'Shan Yao', 'Inhame chinês', 'Dioscoreae Rhizoma', 'N', 'doce', 'BP, P, R', 'Tonifica o Baço, o Pulmão e o Rim; nutre o Yin; firma a essência.', '', []],
  ['gan-cao', 'Gan Cao / Zhi Gan Cao', 'Alcaçuz (cru / tostado no mel)', 'Glycyrrhizae Radix', 'N', 'doce', 'C, P, BP, E', 'Harmoniza as fórmulas; tonifica o Qi do Baço e do Coração; alivia espasmos e tosse.', 'Uso prolongado ou em dose alta retém sódio e água e baixa o potássio: cuidado na pressão alta, edema, doenças do coração e do rim.', ['pressao']],
  ['da-zao', 'Da Zao', 'Tâmara chinesa (jujuba)', 'Jujubae Fructus', 'M', 'doce', 'BP, E', 'Tonifica o Baço; nutre o Sangue; acalma; harmoniza.', 'Cuidado com umidade e catarro.', []],
  ['bai-bian-dou', 'Bai Bian Dou', 'Feijão-de-lablabe', 'Lablab Semen', 'M', 'doce', 'BP, E', 'Fortalece o Baço e transforma umidade.', '', []],
  ['yi-yi-ren', 'Yi Yi Ren', 'Lágrima-de-Jó', 'Coicis Semen', 'F', 'doce, insípido', 'BP, E, P', 'Drena umidade; fortalece o Baço; elimina calor e pus.', 'Evitar na gestação (uso cauteloso).', ['gest']],
  ['lian-zi', 'Lian Zi', 'Semente de lótus', 'Nelumbinis Semen', 'N', 'doce, adstringente', 'BP, R, C', 'Fortalece o Baço, firma o Rim e acalma o Coração.', 'Evitar na prisão de ventre.', []],
  // Tonificam o Sangue
  ['dang-gui', 'Dang Gui', 'Angélica chinesa', 'Angelicae sinensis Radix', 'M', 'doce, picante', 'F, C, BP', 'Nutre e move o Sangue; regula a menstruação; umedece o intestino.', 'Interage com anticoagulantes (varfarina); evitar na diarreia por umidade e no início da gestação sem orientação.', ['anticoag']],
  ['shu-di-huang', 'Shu Di Huang', 'Rehmannia preparada', 'Rehmanniae Radix preparata', 'M', 'doce', 'F, R, C', 'Nutre o Sangue e o Yin do Rim; preenche a essência.', 'Pesada para a digestão: cuidado com Baço fraco, umidade e falta de apetite.', []],
  ['bai-shao', 'Bai Shao', 'Peônia branca', 'Paeoniae Radix alba', 'F', 'amargo, ácido', 'F, BP', 'Nutre o Sangue; acalma o Fígado; alivia dores e espasmos.', '', []],
  ['long-yan-rou', 'Long Yan Rou', 'Polpa de longana', 'Longan Arillus', 'M', 'doce', 'C, BP', 'Nutre o Sangue do Coração; acalma o Shen.', 'Evitar com umidade e catarro.', []],
  ['e-jiao', 'E Jiao', 'Gelatina de pele de burro', 'Asini Corii Colla', 'N', 'doce', 'P, F, R', 'Nutre o Sangue e o Yin; para sangramentos; umedece a secura.', 'De origem animal; difícil de digerir.', ['animal']],
  ['gou-qi-zi', 'Gou Qi Zi', 'Goji', 'Lycii Fructus', 'N', 'doce', 'F, R, P', 'Nutre o Yin do Fígado e do Rim; beneficia os olhos.', 'Pode interagir com varfarina.', ['anticoag']],
  // Tonificam o Yin
  ['mai-men-dong', 'Mai Men Dong', 'Ofiopogon', 'Ophiopogonis Radix', 'F', 'doce, levemente amargo', 'P, C, E', 'Nutre o Yin do Pulmão, do Estômago e do Coração; gera líquidos.', 'Evitar na diarreia por frio e com catarro.', []],
  ['tian-men-dong', 'Tian Men Dong', 'Aspargo chinês', 'Asparagi Radix', 'Fr', 'doce, amargo', 'P, R', 'Nutre o Yin do Pulmão e do Rim; clareia calor.', 'Evitar na diarreia por frio.', []],
  ['sha-shen', 'Sha Shen', 'Glehnia', 'Glehniae / Adenophorae Radix', 'F', 'doce', 'P, E', 'Nutre o Yin do Pulmão e do Estômago; acalma a tosse seca.', '', []],
  ['yu-zhu', 'Yu Zhu', 'Selo-de-salomão', 'Polygonati odorati Rhizoma', 'F', 'doce', 'P, E', 'Nutre o Yin do Pulmão e do Estômago.', '', []],
  ['bai-he', 'Bai He', 'Bulbo de lírio', 'Lilii Bulbus', 'F', 'doce', 'P, C', 'Nutre o Yin do Pulmão; acalma o Shen.', '', []],
  ['gui-ban', 'Gui Ban', 'Casco de tartaruga', 'Testudinis Plastrum', 'Fr', 'doce, salgado', 'R, F, C', 'Nutre o Yin; ancora o Yang; fortalece ossos.', 'Origem animal (espécies protegidas — usar só de fonte legal); evitar na gestação.', ['animal', 'gest']],
  ['shan-zhu-yu', 'Shan Zhu Yu', 'Cornus', 'Corni Fructus', 'M', 'ácido', 'F, R', 'Tonifica Fígado e Rim; firma a essência; contém transpiração e perdas.', '', []],
  // Tonificam o Yang
  ['fu-zi', 'Fu Zi (preparado)', 'Acônito preparado', 'Aconiti lateralis Radix praeparata', 'Q', 'picante', 'C, R, BP', 'Resgata o Yang; aquece o Fogo do Rim e do Baço; dispersa o frio e alivia dores.', 'TÓXICA: usar só preparada, em dose baixa e por terapeuta experiente; cozinhar por longo tempo. Proibida na gestação; não usar com calor ou deficiência de Yin.', ['toxica', 'gest']],
  ['rou-gui', 'Rou Gui', 'Canela (casca)', 'Cinnamomi Cortex', 'Q', 'picante, doce', 'R, BP, C, F', 'Aquece o Yang do Rim; leva o fogo de volta à origem; aquece os canais e alivia dores.', 'Evitar na gestação, sangramentos e calor por deficiência de Yin.', ['gest']],
  ['du-zhong', 'Du Zhong', 'Eucômia', 'Eucommiae Cortex', 'M', 'doce', 'F, R', 'Tonifica Fígado e Rim; fortalece lombar e joelhos; acalma o feto.', '', []],
  ['tu-si-zi', 'Tu Si Zi', 'Cuscuta', 'Cuscutae Semen', 'N', 'doce, picante', 'F, R', 'Tonifica o Yang e o Yin do Rim; firma a essência; beneficia os olhos.', '', []],
  ['lu-jiao-jiao', 'Lu Jiao Jiao', 'Gelatina de chifre de cervo', 'Cervi Cornus Colla', 'M', 'doce, salgado', 'F, R', 'Tonifica o Yang do Rim e a essência; nutre o Sangue.', 'Origem animal; evitar com calor.', ['animal']],
  ['yi-zhi-ren', 'Yi Zhi Ren', 'Alpinia oxyphylla', 'Alpiniae oxyphyllae Fructus', 'M', 'picante', 'BP, R', 'Aquece o Rim e o Baço; contém urina, salivação e diarreia.', '', []],
  ['sha-yuan-zi', 'Sha Yuan Zi', 'Astrágalo achatado', 'Astragali complanati Semen', 'M', 'doce', 'F, R', 'Firma a essência; tonifica o Rim; beneficia os olhos.', '', []],
  // Adstringentes
  ['wu-wei-zi', 'Wu Wei Zi', 'Esquisandra', 'Schisandrae Fructus', 'M', 'ácido (os cinco sabores)', 'P, C, R', 'Contém o Qi do Pulmão e a tosse crônica; contém suor e perdas; acalma o Shen.', 'Evitar na fase aguda de tosse, gripe ou calor.', []],
  ['qian-shi', 'Qian Shi', 'Semente de eurialo', 'Euryales Semen', 'N', 'doce, adstringente', 'BP, R', 'Firma o Rim e contém perdas; fortalece o Baço.', '', []],
  ['lian-xu', 'Lian Xu', 'Estame de lótus', 'Nelumbinis Stamen', 'N', 'doce, adstringente', 'C, R', 'Firma o Rim e contém perdas seminais e urina.', '', []],
  ['wu-mei', 'Wu Mei', 'Ameixa defumada', 'Mume Fructus', 'M', 'ácido', 'F, BP, P, IG', 'Contém o Pulmão e o intestino; gera líquidos; acalma parasitas.', 'Evitar com calor no exterior.', []],
  // Acalmam o Shen
  ['suan-zao-ren', 'Suan Zao Ren', 'Semente de jujuba ácida', 'Ziziphi spinosae Semen', 'N', 'doce, ácido', 'C, F, VB', 'Nutre o Coração e o Fígado; acalma o Shen; contém suor. Clássica para insônia.', '', []],
  ['bai-zi-ren', 'Bai Zi Ren', 'Semente de tuia', 'Platycladi Semen', 'N', 'doce', 'C, R, IG', 'Nutre o Coração; acalma o Shen; umedece o intestino.', 'Evitar na diarreia.', []],
  ['yuan-zhi', 'Yuan Zhi', 'Polígala', 'Polygalae Radix', 'M', 'amargo, picante', 'C, R, P', 'Acalma o Shen; une Coração e Rim; transforma catarro.', 'Pode irritar o estômago; cuidado com úlcera.', []],
  ['fu-shen', 'Fu Shen', 'Poria com raiz', 'Poria cum Radice Pini', 'N', 'doce, insípido', 'C, BP', 'Acalma o Shen; drena umidade.', '', []],
  ['long-gu', 'Long Gu / Long Chi', 'Osso / dente fóssil', 'Fossilia Ossis', 'N', 'doce, adstringente', 'C, F, R', 'Acalma o Shen; ancora o Yang do Fígado; contém perdas.', 'Mineral; pesado para a digestão.', ['mineral']],
  ['mu-li', 'Mu Li', 'Concha de ostra', 'Ostreae Concha', 'F', 'salgado', 'F, R', 'Ancora o Yang; acalma; amolece nódulos; contém perdas.', 'Mineral/concha.', ['mineral']],
  ['ye-jiao-teng', 'Ye Jiao Teng', 'Caule de polígono', 'Polygoni multiflori Caulis', 'N', 'doce', 'C, F', 'Nutre o Sangue e acalma o Shen; alivia dores nos canais.', '', []],
  ['shi-chang-pu', 'Shi Chang Pu', 'Ácoro', 'Acori tatarinowii Rhizoma', 'M', 'picante', 'C, E', 'Abre os orifícios do Coração; transforma umidade e catarro; acalma.', '', []],
  // Drenam umidade
  ['fu-ling', 'Fu Ling', 'Poria', 'Poria', 'N', 'doce, insípido', 'C, BP, R', 'Drena umidade; fortalece o Baço; acalma o Shen.', '', []],
  ['ze-xie', 'Ze Xie', 'Alisma', 'Alismatis Rhizoma', 'Fr', 'doce', 'R, B', 'Drena umidade e clareia calor do Rim.', '', []],
  ['zhu-ling', 'Zhu Ling', 'Poliporo', 'Polyporus', 'N', 'doce, insípido', 'R, B', 'Drena umidade e promove a urina.', '', []],
  ['che-qian-zi', 'Che Qian Zi', 'Semente de tanchagem', 'Plantaginis Semen', 'Fr', 'doce', 'R, B, F, P', 'Drena umidade-calor pela urina; clareia os olhos; acalma a tosse.', 'Evitar na gestação (uso cauteloso).', ['gest']],
  ['mu-tong', 'Mu Tong', 'Akebia (caule)', 'Akebiae Caulis', 'Fr', 'amargo', 'C, ID, B', 'Drena calor do Coração e da Bexiga pela urina.', 'IMPORTANTE: usar só Akebia (Chuan Mu Tong ou Bai Mu Tong). A variedade Guan Mu Tong (Aristolochia) contém ácido aristolóquico, que causa insuficiência renal e câncer — proibida. Evitar na gestação.', ['toxica', 'gest']],
  ['hua-shi', 'Hua Shi', 'Talco', 'Talcum', 'Fr', 'doce, insípido', 'E, B', 'Drena umidade-calor pela urina; clareia calor de verão.', 'Mineral; evitar na gestação.', ['mineral', 'gest']],
  ['bian-xu', 'Bian Xu', 'Sanguinária', 'Polygoni avicularis Herba', 'F', 'amargo', 'B', 'Drena umidade-calor da Bexiga.', '', []],
  ['qu-mai', 'Qu Mai', 'Cravina', 'Dianthi Herba', 'Fr', 'amargo', 'C, ID, B', 'Drena umidade-calor da Bexiga; move o Sangue.', 'Evitar na gestação.', ['gest']],
  ['bi-xie', 'Bi Xie', 'Dioscorea hypoglauca', 'Dioscoreae hypoglaucae Rhizoma', 'N', 'amargo', 'F, E, B', 'Separa o turvo do claro; drena umidade da Bexiga.', '', []],
  ['yin-chen', 'Yin Chen', 'Artemísia capilar', 'Artemisiae scopariae Herba', 'F', 'amargo', 'BP, E, F, VB', 'Drena umidade-calor do Fígado e da Vesícula; clássica para icterícia.', 'Icterícia exige avaliação médica.', []],
  // Aromáticos que transformam umidade
  ['cang-zhu', 'Cang Zhu', 'Atractilódio', 'Atractylodis Rhizoma', 'M', 'picante, amargo', 'BP, E', 'Seca a umidade; fortalece o Baço; dispersa vento-umidade.', 'Evitar na deficiência de Yin.', []],
  ['hou-po', 'Hou Po', 'Magnólia (casca)', 'Magnoliae officinalis Cortex', 'M', 'amargo, picante', 'BP, E, P, IG', 'Move o Qi, seca a umidade, desfaz a plenitude; acalma a tosse.', 'Evitar na gestação.', ['gest']],
  ['huo-xiang', 'Huo Xiang', 'Patchouli', 'Pogostemonis Herba', 'M', 'picante', 'BP, E, P', 'Transforma umidade; harmoniza o Estômago; para náusea; libera o exterior.', '', []],
  ['sha-ren', 'Sha Ren', 'Amomo', 'Amomi Fructus', 'M', 'picante', 'BP, E', 'Transforma umidade; move o Qi; para náusea; acalma o feto.', '', []],
  // Regulam o Qi
  ['chen-pi', 'Chen Pi', 'Casca de tangerina', 'Citri reticulatae Pericarpium', 'M', 'picante, amargo', 'BP, P', 'Move o Qi; seca a umidade; transforma catarro; harmoniza o Estômago.', '', []],
  ['qing-pi', 'Qing Pi', 'Casca de tangerina verde', 'Citri reticulatae viride Pericarpium', 'M', 'amargo, picante', 'F, VB, E', 'Desfaz a estagnação do Fígado; alivia dor.', '', []],
  ['zhi-ke', 'Zhi Ke / Zhi Shi', 'Laranja amarga (madura / imatura)', 'Aurantii Fructus', 'F', 'amargo, picante', 'BP, E, IG', 'Move o Qi, desfaz plenitude e acúmulos; Zhi Shi é mais forte.', 'Evitar na gestação (sobretudo Zhi Shi).', ['gest']],
  ['xiang-fu', 'Xiang Fu', 'Tiririca (rizoma)', 'Cyperi Rhizoma', 'N', 'picante, amargo, doce', 'F, BP, TA', 'Desfaz a estagnação do Qi do Fígado; regula a menstruação; alivia dores.', '', []],
  ['mu-xiang', 'Mu Xiang', 'Saussurea', 'Aucklandiae Radix', 'M', 'picante, amargo', 'BP, E, IG, VB', 'Move o Qi do Baço e do intestino; alivia dor e plenitude.', '', []],
  ['wu-yao', 'Wu Yao', 'Lindera', 'Linderae Radix', 'M', 'picante', 'P, BP, R, B', 'Move o Qi; aquece o Rim; alivia dor do baixo ventre; contém urina.', '', []],
  ['chuan-lian-zi', 'Chuan Lian Zi', 'Fruto de melia', 'Toosendan Fructus', 'Fr', 'amargo', 'F, ID, B', 'Move o Qi do Fígado e alivia dor; elimina parasitas.', 'Levemente tóxica (hepatotóxica): dose baixa e por pouco tempo.', ['toxica']],
  ['xiao-hui-xiang', 'Xiao Hui Xiang', 'Funcho', 'Foeniculi Fructus', 'M', 'picante', 'F, R, BP, E', 'Aquece e dispersa o frio do baixo ventre; move o Qi; alivia dor.', '', []],
  ['bing-lang', 'Bing Lang', 'Noz de areca', 'Arecae Semen', 'M', 'amargo, picante', 'E, IG', 'Elimina parasitas; move o Qi; drena edema.', 'O uso continuado da areca é associado a câncer de boca; usar só por curto período. Evitar na gestação.', ['toxica', 'gest']],
  ['da-fu-pi', 'Da Fu Pi', 'Casca de areca', 'Arecae Pericarpium', 'M', 'picante', 'BP, E, IG, ID', 'Move o Qi; drena umidade e edema.', '', []],
  ['xuan-fu-hua', 'Xuan Fu Hua', 'Flor de ínula', 'Inulae Flos', 'M', 'amargo, picante, salgado', 'P, E', 'Faz descer o Qi do Pulmão e do Estômago; transforma catarro; para náusea e soluço.', 'Embrulhar (pelos irritam a garganta).', []],
  ['dai-zhe-shi', 'Dai Zhe Shi', 'Hematita', 'Haematitum', 'Fr', 'amargo', 'F, C', 'Faz descer o Qi rebelde; ancora o Yang; para sangramentos.', 'Mineral; evitar na gestação e por tempo prolongado.', ['mineral', 'gest']],
  // Movem o Sangue
  ['chuan-xiong', 'Chuan Xiong', 'Ligústico', 'Chuanxiong Rhizoma', 'M', 'picante', 'F, VB, CS', 'Move o Sangue e o Qi; alivia dores, sobretudo de cabeça.', 'Evitar na gestação e em sangramentos intensos.', ['gest', 'anticoag']],
  ['dan-shen', 'Dan Shen', 'Sálvia vermelha', 'Salviae miltiorrhizae Radix', 'F', 'amargo', 'C, F', 'Move o Sangue; acalma o Shen; clareia calor do Coração.', 'Interage com anticoagulantes (varfarina); evitar na gestação.', ['anticoag', 'gest']],
  ['tao-ren', 'Tao Ren', 'Semente de pêssego', 'Persicae Semen', 'N', 'amargo, doce', 'C, F, IG', 'Move o Sangue e desfaz estase; umedece o intestino.', 'Evitar na gestação; interage com anticoagulantes.', ['gest', 'anticoag']],
  ['hong-hua', 'Hong Hua', 'Cártamo', 'Carthami Flos', 'M', 'picante', 'C, F', 'Move o Sangue; regula a menstruação; alivia dor.', 'Proibida na gestação; interage com anticoagulantes; cuidado em sangramentos.', ['gest', 'anticoag']],
  ['chi-shao', 'Chi Shao', 'Peônia vermelha', 'Paeoniae Radix rubra', 'F', 'amargo', 'F', 'Clareia calor do Sangue; move o Sangue; alivia dor.', 'Evitar na gestação.', ['gest', 'anticoag']],
  ['niu-xi', 'Niu Xi (Chuan / Huai)', 'Aquirantes', 'Achyranthis / Cyathulae Radix', 'N', 'amargo, ácido', 'F, R', 'Move o Sangue para baixo; fortalece lombar e joelhos; leva o Yang para baixo.', 'Proibida na gestação; evitar na menstruação abundante.', ['gest']],
  ['yi-mu-cao', 'Yi Mu Cao', 'Erva-de-mãe (agripalma)', 'Leonuri Herba', 'F', 'picante, amargo', 'C, F, B', 'Move o Sangue; regula a menstruação; drena edema.', 'Proibida na gestação.', ['gest']],
  ['wu-ling-zhi', 'Wu Ling Zhi', 'Fezes de esquilo voador', 'Trogopterori Faeces', 'M', 'amargo, doce', 'F', 'Move o Sangue e alivia dor.', 'Origem animal; evitar na gestação.', ['animal', 'gest']],
  ['yan-hu-suo', 'Yan Hu Suo', 'Coridális', 'Corydalis Rhizoma', 'M', 'picante, amargo', 'F, BP, C', 'Move o Sangue e o Qi; analgésico potente.', 'Evitar na gestação; pode dar sonolência.', ['gest']],
  ['mu-dan-pi', 'Mu Dan Pi', 'Casca de peônia arbórea', 'Moutan Cortex', 'F', 'amargo, picante', 'C, F, R', 'Clareia calor do Sangue e calor por deficiência; move o Sangue.', 'Evitar na gestação e na menstruação abundante.', ['gest']],
  // Clareiam calor
  ['huang-lian', 'Huang Lian', 'Copte', 'Coptidis Rhizoma', 'Fr', 'amargo', 'C, F, E, IG', 'Clareia calor e seca a umidade; drena o Fogo do Coração e do Estômago.', 'Muito fria: evitar no frio do Baço; cuidado na gestação e em recém-nascidos com icterícia.', []],
  ['huang-qin', 'Huang Qin', 'Escutelária', 'Scutellariae Radix', 'Fr', 'amargo', 'P, VB, E, IG', 'Clareia calor e umidade-calor, sobretudo do Pulmão; acalma o feto.', 'Evitar no frio do Baço.', []],
  ['huang-bai', 'Huang Bai', 'Felodendro', 'Phellodendri Cortex', 'Fr', 'amargo', 'R, B, IG', 'Clareia umidade-calor do Aquecedor Inferior e calor por deficiência do Rim.', 'Evitar no frio do Baço.', []],
  ['zhi-zi', 'Zhi Zi', 'Gardênia', 'Gardeniae Fructus', 'Fr', 'amargo', 'C, F, P, E, TA', 'Clareia calor dos três Aquecedores; drena umidade-calor; acalma a irritação.', 'Evitar na diarreia por frio.', []],
  ['long-dan-cao', 'Long Dan Cao', 'Genciana', 'Gentianae Radix', 'Fr', 'amargo', 'F, VB, B', 'Drena o Fogo do Fígado e a umidade-calor do Fígado e da Vesícula.', 'Muito fria: uso curto; evitar no frio do Baço.', []],
  ['zhi-mu', 'Zhi Mu', 'Anemarrena', 'Anemarrhenae Rhizoma', 'Fr', 'amargo, doce', 'P, E, R', 'Clareia calor e nutre o Yin.', 'Evitar na diarreia.', []],
  ['shi-gao', 'Shi Gao', 'Gesso', 'Gypsum fibrosum', 'Fr', 'picante, doce', 'P, E', 'Clareia calor intenso do Pulmão e do Estômago.', 'Mineral; muito frio.', ['mineral']],
  ['sheng-di-huang', 'Sheng Di Huang', 'Rehmannia crua', 'Rehmanniae Radix', 'Fr', 'doce, amargo', 'C, F, R', 'Clareia calor do Sangue; nutre o Yin; gera líquidos.', 'Pesada para o Baço fraco.', []],
  ['xuan-shen', 'Xuan Shen', 'Escrofulária', 'Scrophulariae Radix', 'Fr', 'doce, amargo, salgado', 'P, E, R', 'Nutre o Yin e clareia calor; desfaz nódulos.', '', []],
  ['jin-yin-hua', 'Jin Yin Hua', 'Madressilva', 'Lonicerae Flos', 'Fr', 'doce', 'P, E, IG', 'Clareia calor e toxinas; libera o vento-calor.', '', []],
  ['lian-qiao', 'Lian Qiao', 'Forsítia', 'Forsythiae Fructus', 'F', 'amargo', 'P, C, VB', 'Clareia calor e toxinas; desfaz inflamações.', '', []],
  ['bai-tou-weng', 'Bai Tou Weng', 'Pulsatila', 'Pulsatillae Radix', 'Fr', 'amargo', 'E, IG', 'Clareia calor e toxinas do intestino; para disenteria.', '', []],
  ['qin-pi', 'Qin Pi', 'Casca de freixo', 'Fraxini Cortex', 'Fr', 'amargo', 'F, VB, IG', 'Clareia umidade-calor do intestino.', '', []],
  ['dan-zhu-ye', 'Dan Zhu Ye', 'Folha de bambu', 'Lophatheri Herba', 'Fr', 'doce, insípido', 'C, E, ID', 'Clareia calor do Coração e drena pela urina.', '', []],
  ['lu-gen', 'Lu Gen', 'Raiz de junco', 'Phragmitis Rhizoma', 'Fr', 'doce', 'P, E', 'Clareia calor do Pulmão e do Estômago; gera líquidos.', '', []],
  ['sheng-ma', 'Sheng Ma', 'Cimicífuga', 'Cimicifugae Rhizoma', 'F', 'picante, doce', 'P, BP, E, IG', 'Eleva o Yang; clareia calor e toxinas do Estômago.', '', []],
  ['chai-hu', 'Chai Hu', 'Bupleuro', 'Bupleuri Radix', 'F', 'amargo, picante', 'F, VB', 'Desfaz a estagnação do Fígado; eleva o Yang; trata o calor-frio alternado.', 'Evitar na ascensão do Yang do Fígado e na deficiência de Yin com calor.', []],
  // Liberam o exterior
  ['gui-zhi', 'Gui Zhi', 'Canela (ramo)', 'Cinnamomi Ramulus', 'M', 'picante, doce', 'C, P, B', 'Libera o exterior; aquece os canais; aquece o Yang do Coração.', 'Evitar com calor e na gestação com sangramento.', []],
  ['sheng-jiang', 'Sheng Jiang / Gan Jiang', 'Gengibre (fresco / seco)', 'Zingiberis Rhizoma', 'M', 'picante', 'P, BP, E', 'Fresco: libera o exterior e para náusea. Seco (Gan Jiang, quente): aquece o centro e o Pulmão.', 'Evitar com calor e na deficiência de Yin.', []],
  ['bo-he', 'Bo He', 'Hortelã', 'Menthae Herba', 'F', 'picante', 'P, F', 'Libera o vento-calor; desfaz a estagnação do Fígado.', 'Acrescentar no fim do cozimento.', []],
  ['sang-ye', 'Sang Ye', 'Folha de amoreira', 'Mori Folium', 'Fr', 'doce, amargo', 'P, F', 'Libera o vento-calor; umedece o Pulmão; clareia os olhos.', '', []],
  ['ju-hua', 'Ju Hua', 'Crisântemo', 'Chrysanthemi Flos', 'F', 'doce, amargo', 'P, F', 'Libera o vento-calor; acalma o Fígado; clareia os olhos.', '', []],
  ['jing-jie', 'Jing Jie', 'Esquizonepeta', 'Schizonepetae Herba', 'M', 'picante', 'P, F', 'Libera o exterior (vento-frio ou vento-calor); alivia coceira.', '', []],
  ['fang-feng', 'Fang Feng', 'Saposhnikovia', 'Saposhnikoviae Radix', 'M', 'picante, doce', 'B, F, BP', 'Libera o vento e a umidade; alivia dores e espasmos.', '', []],
  ['niu-bang-zi', 'Niu Bang Zi', 'Bardana (semente)', 'Arctii Fructus', 'Fr', 'picante, amargo', 'P, E', 'Libera o vento-calor; desinflama a garganta.', 'Evitar na diarreia.', []],
  ['dan-dou-chi', 'Dan Dou Chi', 'Soja fermentada', 'Sojae Semen praeparatum', 'F', 'picante, doce', 'P, E', 'Libera o exterior suavemente; alivia a inquietação.', '', []],
  ['qiang-huo', 'Qiang Huo / Du Huo', 'Notopterígio / Angélica pubescente', 'Notopterygii / Angelicae pubescentis Radix', 'M', 'picante, amargo', 'B, R', 'Dispersam vento-frio-umidade e aliviam dores (Qiang Huo em cima, Du Huo embaixo).', '', []],
  ['xi-xin', 'Xi Xin', 'Asaro', 'Asari Radix', 'M', 'picante', 'C, P, R', 'Aquece o Pulmão e transforma catarro fino; alivia dor; abre o nariz.', 'TÓXICA em dose alta e as partes aéreas contêm ácido aristolóquico: usar só a raiz, em dose baixa, por terapeuta experiente.', ['toxica']],
  ['bai-zhi', 'Bai Zhi', 'Angélica dahúrica', 'Angelicae dahuricae Radix', 'M', 'picante', 'P, E', 'Libera o vento; alivia dor da fronte; abre o nariz; seca umidade.', '', []],
  ['zi-su-ye', 'Zi Su Ye', 'Perila', 'Perillae Folium', 'M', 'picante', 'P, BP', 'Libera o vento-frio; move o Qi do centro; para náusea.', '', []],
  ['ge-gen', 'Ge Gen', 'Kudzu', 'Puerariae Radix', 'F', 'doce, picante', 'BP, E', 'Libera músculos (nuca rígida); eleva o Yang; para diarreia; gera líquidos.', '', []],
  // Catarro e tosse
  ['ban-xia', 'Ban Xia (preparado)', 'Pinélia preparada', 'Pinelliae Rhizoma praeparatum', 'M', 'picante', 'BP, E, P', 'Seca a umidade e transforma catarro; faz descer o Qi; para náusea.', 'Usar só preparada (crua é tóxica). Evitar na gestação e na tosse seca por Yin.', ['toxica', 'gest']],
  ['zhu-ru', 'Zhu Ru', 'Raspa de bambu', 'Bambusae Caulis in taenia', 'F', 'doce', 'P, E, VB', 'Transforma catarro-calor; acalma náusea e inquietação.', '', []],
  ['jie-geng', 'Jie Geng', 'Platicódon', 'Platycodi Radix', 'N', 'amargo, picante', 'P', 'Abre o Pulmão; elimina catarro; desinflama a garganta; leva a fórmula para cima.', '', []],
  ['bei-mu', 'Bei Mu (Chuan / Zhe)', 'Fritilária', 'Fritillariae Bulbus', 'F', 'amargo, doce', 'P, C', 'Transforma catarro-calor; umedece o Pulmão; desfaz nódulos.', '', []],
  ['gua-lou', 'Gua Lou Ren', 'Semente de tricosantes', 'Trichosanthis Semen', 'Fr', 'doce', 'P, E, IG', 'Transforma catarro-calor; umedece o intestino.', 'Evitar na diarreia.', []],
  ['dan-nan-xing', 'Dan Nan Xing', 'Arisema com bile', 'Arisaema cum Bile', 'F', 'amargo', 'P, F, BP', 'Transforma catarro-calor; acalma o vento.', 'Só a forma preparada; evitar na gestação.', ['toxica', 'gest']],
  ['xing-ren', 'Xing Ren', 'Semente de damasco', 'Armeniacae Semen amarum', 'M', 'amargo', 'P, IG', 'Acalma a tosse e a falta de ar; umedece o intestino.', 'Levemente tóxica (amigdalina): não exceder a dose; cuidado em crianças.', ['toxica']],
  ['zi-wan', 'Zi Wan', 'Áster', 'Asteris Radix', 'M', 'amargo, picante', 'P', 'Umedece o Pulmão e acalma a tosse; transforma catarro.', '', []],
  ['sang-bai-pi', 'Sang Bai Pi', 'Casca da raiz da amoreira', 'Mori Cortex', 'Fr', 'doce', 'P', 'Clareia calor do Pulmão; acalma a tosse; drena edema.', '', []],
  ['pi-pa-ye', 'Pi Pa Ye', 'Folha de nêspera', 'Eriobotryae Folium', 'F', 'amargo', 'P, E', 'Acalma a tosse e a náusea; transforma catarro-calor.', '', []],
  ['qian-hu', 'Qian Hu', 'Peucedano', 'Peucedani Radix', 'F', 'amargo, picante', 'P', 'Faz descer o Qi do Pulmão e transforma catarro; libera o vento-calor.', '', []],
  // Digestão
  ['shan-zha', 'Shan Zha', 'Fruto do pilriteiro', 'Crataegi Fructus', 'M', 'ácido, doce', 'BP, E, F', 'Desfaz a retenção de alimentos (sobretudo carne e gordura); move o Sangue.', 'Evitar na úlcera com acidez.', []],
  ['shen-qu', 'Shen Qu', 'Massa fermentada', 'Massa medicata fermentata', 'M', 'doce, picante', 'BP, E', 'Desfaz a retenção de alimentos; harmoniza o Estômago.', '', []],
  ['mai-ya', 'Mai Ya', 'Malte de cevada', 'Hordei Fructus germinatus', 'N', 'doce', 'BP, E, F', 'Desfaz a retenção de alimentos (amido); move o Qi do Fígado.', 'Em dose alta reduz o leite materno.', []],
  ['lai-fu-zi', 'Lai Fu Zi', 'Semente de rabanete', 'Raphani Semen', 'N', 'picante, doce', 'BP, E, P', 'Desfaz a retenção de alimentos; faz descer o Qi; transforma catarro.', 'Não combinar com Ginseng.', []],
  ['gao-liang-jiang', 'Gao Liang Jiang', 'Galanga', 'Alpiniae officinarum Rhizoma', 'Q', 'picante', 'BP, E', 'Aquece o Estômago e alivia a dor por frio.', 'Evitar com calor.', []],
  ['hua-jiao', 'Hua Jiao', 'Pimenta de Sichuan', 'Zanthoxyli Pericarpium', 'Q', 'picante', 'BP, E, R', 'Aquece o centro; alivia dor; elimina parasitas.', 'Evitar na gestação.', ['gest']],
  ['da-huang', 'Da Huang', 'Ruibarbo', 'Rhei Radix et Rhizoma', 'Fr', 'amargo', 'BP, E, IG, F, C', 'Purga calor e acúmulos; drena o Fogo; move o Sangue.', 'Proibida na gestação, amamentação e menstruação; não usar em fraqueza ou por tempo prolongado.', ['gest']],
  ['ba-dou', 'Ba Dou (preparado)', 'Cróton', 'Crotonis Semen pulveratum', 'Q', 'picante', 'E, IG', 'Purgante forte por frio (usado só no preparo de Tian Tai Wu Yao San).', 'MUITO TÓXICA: no Tian Tai Wu Yao San é usada só para tostar o Chuan Lian Zi e depois descartada. Proibida na gestação.', ['toxica', 'gest']],
  // Vento interno
  ['tian-ma', 'Tian Ma', 'Gastródia', 'Gastrodiae Rhizoma', 'N', 'doce', 'F', 'Acalma o vento interno e o Yang do Fígado; alivia tontura e dor de cabeça.', '', []],
  ['gou-teng', 'Gou Teng', 'Unha-de-gato chinesa', 'Uncariae Ramulus cum Uncis', 'F', 'doce', 'F, CS', 'Acalma o vento e o Yang do Fígado; clareia calor.', 'Acrescentar no fim do cozimento.', []],
  ['shi-jue-ming', 'Shi Jue Ming', 'Concha de haliote', 'Haliotidis Concha', 'Fr', 'salgado', 'F', 'Ancora o Yang do Fígado; clareia os olhos.', 'Concha; cozinhar antes.', ['mineral']],
  ['sang-ji-sheng', 'Sang Ji Sheng', 'Visco da amoreira', 'Taxilli Herba', 'N', 'amargo, doce', 'F, R', 'Fortalece Fígado e Rim; alivia dores reumáticas; acalma o feto.', '', []],
];

E.push(['bai-ji-li', 'Bai Ji Li', 'Tríbulo', 'Tribuli Fructus', 'M', 'amargo, picante', 'F, P', 'Acalma o Fígado e o vento; clareia os olhos; alivia coceira.', 'Evitar na gestação.', ['gest']]);

// Ervas das fórmulas acrescentadas com as síndromes novas (09/10/2026).
E.push(
  ['hu-tao-ren', 'Hu Tao Ren', 'Noz', 'Juglandis Semen', 'M', 'doce', 'R, P, IG', 'Tonifica o Rim e ajuda a receber o Qi; umedece o intestino.', 'Evitar na diarreia e com catarro-calor.', []],
  ['chen-xiang', 'Chen Xiang', 'Madeira de agar (aquilária)', 'Aquilariae Lignum resinatum', 'M', 'picante, amargo', 'R, BP, E', 'Move o Qi e alivia a dor; aquece o centro; ajuda o Rim a receber o Qi.', 'Evitar no calor por deficiência de Yin e no Qi afundado.', []],
  ['yi-tang', 'Yi Tang', 'Maltose', 'Maltosum', 'M', 'doce', 'BP, E, P', 'Tonifica e aquece o centro; alivia a dor espasmódica; umedece o Pulmão.', 'Evitar no diabetes, com umidade, catarro ou vômito.', []],
  ['huo-ma-ren', 'Huo Ma Ren', 'Semente de cânhamo', 'Cannabis Semen', 'N', 'doce', 'BP, E, IG', 'Umedece o intestino e solta as fezes.', 'Só a semente (sem efeito psicoativo). Em dose alta pode intoxicar; evitar na diarreia.', []],
  ['mang-xiao', 'Mang Xiao', 'Sulfato de sódio (sal de Glauber)', 'Natrii Sulfas', 'Fr', 'salgado, amargo', 'E, IG', 'Purga o Calor e amolece fezes endurecidas.', 'Purgante forte: proibido na gestação; não usar em fraqueza nem por tempo prolongado.', ['gest', 'mineral']],
  ['pu-huang', 'Pu Huang', 'Pólen de taboa', 'Typhae Pollen', 'N', 'doce', 'F, CS', 'Move o Sangue e alivia a dor; também estanca sangramentos (tostado).', 'Evitar na gestação.', ['gest', 'anticoag']],
  ['tan-xiang', 'Tan Xiang', 'Sândalo', 'Santali albi Lignum', 'M', 'picante', 'BP, E, P', 'Move o Qi, aquece o centro e alivia a dor no peito e no estômago.', 'Evitar no calor por deficiência de Yin.', []],
  ['di-gu-pi', 'Di Gu Pi', 'Casca da raiz do goji', 'Lycii Cortex', 'Fr', 'doce', 'P, F, R', 'Clareia o Calor por deficiência e o Calor do Pulmão; esfria o Sangue.', 'Evitar na diarreia por frio.', []],
  ['qing-hao', 'Qing Hao', 'Artemísia anual', 'Artemisiae annuae Herba', 'Fr', 'amargo, picante', 'F, VB', 'Clareia o Calor por deficiência e o Calor do Sangue.', 'Evitar na diarreia por deficiência do Baço.', []],
  ['geng-mi', 'Geng Mi', 'Arroz', 'Oryzae Semen', 'N', 'doce', 'BP, E', 'Protege o Estômago e gera líquidos.', '', []],
);

// Revisão com Bensky & Gamble (Materia Medica): cuidados acrescentados.
const REV = {
  'dang-shen': ['Classicamente incompatível com Li Lu (Veratrum).', []],
  'shan-yao': ['Evitar com plenitude por umidade, estagnação ou acúmulo.', []],
  'bai-shao': ['Cuidado na diarreia por frio e no Yang fraco.', []],
  'du-zhong': ['Evitar no calor por deficiência de Yin.', []],
  'shi-chang-pu': ['Cuidado na deficiência de Yin com calor, suor excessivo, vômito de sangue ou perdas seminais.', []],
  'fu-ling': ['Evitar com urina abundante por frio.', []],
  'chuan-xiong': ['Evitar na gestação, sangramento menstrual intenso, deficiência de Yin com calor e dor de cabeça por ascensão do Yang do Fígado; dose alta causa vômito e tontura.', null],
  'sheng-di-huang': ['Pesada para o Baço fraco; evitar com umidade e na deficiência de Yang.', []],
  'xuan-shen': ['Cuidado com umidade no Baço/Estômago e na diarreia.', []],
  'huang-lian': ['Muito fria: evitar no frio do Baço e no Yin deficiente; uso prolongado prejudica o Baço e o Estômago. Cuidado em recém-nascidos com icterícia.', null],
  'dan-zhu-ye': ['Cuidado na gestação.', ['gest']],
  'gui-zhi': ['Evitar com calor, deficiência de Yin, sangue quente; cuidado na gestação e na menstruação abundante.', ['gest']],
  'ban-xia': ['Usar só preparada (crua é tóxica). Evitar na gestação, em qualquer sangramento e na tosse seca por Yin.', null],
  'jie-geng': ['Evitar quando há tosse com sangue.', []],
  'zi-wan': ['Não usar em dose alta nem por muito tempo; cuidado na tosse por deficiência de Yin.', []],
  'shen-qu': ['Cuidado na gestação; evitar com Fogo no Estômago.', ['gest']],
  'mai-ya': ['Em dose alta reduz o leite materno; uso muito prolongado não é recomendado.', null],
  'da-huang': ['Proibida na gestação, amamentação, menstruação e pós-parto; não usar em fraqueza ou por tempo prolongado.', null],
};
for (const row of E) {
  const r = REV[row[0]];
  if (!r) continue;
  row[8] = r[0];
  if (r[1]) for (const a of r[1]) if (!row[9].includes(a)) row[9].push(a);
}

const ervas = Object.fromEntries(E.map(([id, pinyin, nome, latim, nat, sabor, mer, acoes, cuidado, alertas]) =>
  [id, { pinyin, nome, latim, natureza: NAT[nat], sabor, meridianos: mer, acoes, cuidado, alertas }]));

// Fórmulas: [id, pinyin, nome em português, origem, categoria, ervas, ação, indicações, cuidados, síndromes]
const F = [
  ['si-jun-zi-tang', 'Si Jun Zi Tang', 'Decocção dos Quatro Cavalheiros', 'He Ji Ju Fang (Song)', 'Tonificar o Qi', ['ren-shen', 'bai-zhu', 'fu-ling', 'gan-cao'],
    'Tonifica o Qi do Baço e do Estômago.', 'Cansaço, pouco apetite, fezes moles, voz fraca, palidez. Fórmula-base de toda tonificação do Qi.', '', ['DefQiBP', 'DefQiE']],
  ['xiang-sha-liu-jun-zi-tang', 'Xiang Sha Liu Jun Zi Tang', 'Seis Cavalheiros com Saussurea e Amomo', 'Gu Jin Ming Yi Fang Lun (Qing)', 'Tonificar o Qi', ['ren-shen', 'bai-zhu', 'fu-ling', 'gan-cao', 'chen-pi', 'ban-xia', 'mu-xiang', 'sha-ren'],
    'Tonifica o Qi do Baço, move o Qi e transforma umidade e catarro.', 'Deficiência de Qi do Baço/Estômago com estufamento, náusea, arrotos e dor leve no estômago.', '', ['DefQiE', 'DefQiBP']],
  ['shen-ling-bai-zhu-san', 'Shen Ling Bai Zhu San', 'Pó de Ginseng, Poria e Atractilódio', 'He Ji Ju Fang (Song)', 'Tonificar o Qi', ['ren-shen', 'bai-zhu', 'fu-ling', 'gan-cao', 'shan-yao', 'bai-bian-dou', 'lian-zi', 'yi-yi-ren', 'sha-ren', 'jie-geng'],
    'Tonifica o Baço e drena a umidade; firma o intestino.', 'Diarreia crônica, fezes moles, cansaço, pouco apetite, emagrecimento.', '', ['DefQiBP', 'UmdFrioBP']],
  ['bu-zhong-yi-qi-tang', 'Bu Zhong Yi Qi Tang', 'Decocção que Tonifica o Centro e Aumenta o Qi', 'Pi Wei Lun (Li Dong-Yuan)', 'Tonificar o Qi', ['huang-qi', 'ren-shen', 'bai-zhu', 'gan-cao', 'dang-gui', 'chen-pi', 'sheng-ma', 'chai-hu'],
    'Tonifica o Qi do Baço e eleva o Yang que afundou.', 'Prolapsos (útero, reto, hemorroidas), diarreia crônica, cansaço intenso, febre baixa por deficiência, sangramentos leves.', 'Evitar na ascensão do Yang do Fígado e na deficiência de Yin com calor.', ['ColapsQiBP', 'BPcontrXue', 'DefQiBP']],
  ['gui-pi-tang', 'Gui Pi Tang', 'Decocção que Restaura o Baço', 'Ji Sheng Fang (Song)', 'Tonificar Qi e Sangue', ['ren-shen', 'huang-qi', 'bai-zhu', 'fu-shen', 'suan-zao-ren', 'long-yan-rou', 'mu-xiang', 'gan-cao', 'dang-gui', 'yuan-zhi', 'sheng-jiang', 'da-zao'],
    'Tonifica o Qi do Baço e o Sangue do Coração; faz o Baço segurar o Sangue.', 'Insônia, palpitação, esquecimento, preocupação excessiva, cansaço; sangramentos por Baço fraco (menstruação abundante, manchas roxas).', 'Sangramentos devem ser investigados pelo médico.', ['DefXueC', 'BPcontrXue', 'DefQiC']],
  ['yang-xin-tang', 'Yang Xin Tang', 'Decocção que Nutre o Coração', 'Zheng Zhi Zhun Sheng (Ming)', 'Tonificar o Qi do Coração', ['huang-qi', 'ren-shen', 'fu-ling', 'fu-shen', 'dang-gui', 'chuan-xiong', 'ban-xia', 'bai-zi-ren', 'suan-zao-ren', 'yuan-zhi', 'wu-wei-zi', 'rou-gui', 'gan-cao'],
    'Tonifica o Qi e o Sangue do Coração; acalma o Shen.', 'Palpitação, cansaço, falta de ar ao esforço, sono leve, ansiedade.', 'Palpitações e falta de ar exigem avaliação cardiológica.', ['DefQiC', 'DefXueC']],
  ['si-wu-tang', 'Si Wu Tang', 'Decocção das Quatro Substâncias', 'He Ji Ju Fang (Song)', 'Tonificar o Sangue', ['shu-di-huang', 'dang-gui', 'bai-shao', 'chuan-xiong'],
    'Nutre e harmoniza o Sangue; regula a menstruação.', 'Palidez, tontura, vista turva, unhas fracas, menstruação escassa ou atrasada. Fórmula-base do Sangue.', 'Pesada para o Baço fraco; evitar na diarreia.', ['DefXueF']],
  ['liu-wei-di-huang-wan', 'Liu Wei Di Huang Wan', 'Pílula de Rehmannia com Seis Ingredientes', 'Xiao Er Yao Zheng Zhi Jue (Qian Yi)', 'Tonificar o Yin', ['shu-di-huang', 'shan-yao', 'shan-zhu-yu', 'ze-xie', 'fu-ling', 'mu-dan-pi'],
    'Nutre o Yin do Rim e do Fígado.', 'Dor e fraqueza lombar e nos joelhos, tontura, zumbido, suor noturno, calor nas palmas e plantas, boca seca à noite.', 'Evitar com Baço fraco e diarreia.', ['DefYnR', 'DefJgR']],
  ['zhi-bai-di-huang-wan', 'Zhi Bai Di Huang Wan', 'Rehmannia com Anemarrena e Felodendro', 'Yi Zong Jin Jian (Qing)', 'Tonificar o Yin', ['shu-di-huang', 'shan-yao', 'shan-zhu-yu', 'ze-xie', 'fu-ling', 'mu-dan-pi', 'zhi-mu', 'huang-bai'],
    'Nutre o Yin do Rim e clareia o calor por deficiência.', 'Deficiência de Yin com muito calor: ondas de calor, suor noturno, maçãs vermelhas, urina escura.', 'Evitar no frio do Baço.', ['DefYnR']],
  ['zuo-gui-wan', 'Zuo Gui Wan', 'Pílula que Restaura o Rim Esquerdo', 'Jing Yue Quan Shu (Zhang Jing-Yue)', 'Tonificar o Yin e a Essência', ['shu-di-huang', 'shan-yao', 'shan-zhu-yu', 'gou-qi-zi', 'niu-xi', 'tu-si-zi', 'lu-jiao-jiao', 'gui-ban'],
    'Nutre o Yin e a essência do Rim.', 'Deficiência de essência: fraqueza lombar, tontura, zumbido, perdas seminais, cabelo grisalho cedo, desenvolvimento lento.', 'Contém ingredientes animais; Niu Xi e Gui Ban — evitar na gestação.', ['DefJgR', 'DefYnR']],
  ['you-gui-wan', 'You Gui Wan', 'Pílula que Restaura o Rim Direito', 'Jing Yue Quan Shu (Zhang Jing-Yue)', 'Tonificar o Yang', ['shu-di-huang', 'shan-yao', 'shan-zhu-yu', 'gou-qi-zi', 'tu-si-zi', 'lu-jiao-jiao', 'du-zhong', 'dang-gui', 'rou-gui', 'fu-zi'],
    'Aquece o Yang do Rim e preenche a essência.', 'Frio, lombar fria e fraca, impotência, cansaço, urina clara e abundante, fezes moles de manhã.', 'Contém Fu Zi (tóxica) e Rou Gui: proibida na gestação; não usar com calor.', ['DefYgR', 'DefJgR']],
  ['jin-gui-shen-qi-wan', 'Jin Gui Shen Qi Wan', 'Pílula do Qi do Rim do Cofre Dourado', 'Jin Gui Yao Lue (Zhang Zhong-Jing)', 'Tonificar o Yang', ['shu-di-huang', 'shan-yao', 'shan-zhu-yu', 'ze-xie', 'fu-ling', 'mu-dan-pi', 'gui-zhi', 'fu-zi'],
    'Aquece e tonifica o Yang do Rim.', 'Lombar fria, edema nas pernas, urina frequente à noite ou escassa, frio, cansaço.', 'Contém Fu Zi: proibida na gestação; não usar com calor ou deficiência de Yin.', ['DefYgR', 'UmdFrioB']],
  ['li-zhong-wan', 'Li Zhong Wan', 'Pílula que Regula o Centro', 'Shang Han Lun (Zhang Zhong-Jing)', 'Aquecer o centro', ['ren-shen', 'sheng-jiang', 'bai-zhu', 'gan-cao'],
    'Aquece o Baço e o Estômago e tonifica o Qi (usa o gengibre seco, Gan Jiang).', 'Dor abdominal que melhora com calor e pressão, diarreia, vômito, frio, sem sede. Com Fu Zi vira Fu Zi Li Zhong Wan (frio mais intenso).', 'Evitar com calor.', ['DefYgBP', 'FrioE']],
  ['gui-zhi-gan-cao-tang', 'Gui Zhi Gan Cao Tang', 'Decocção de Canela e Alcaçuz', 'Shang Han Lun (Zhang Zhong-Jing)', 'Aquecer o Yang do Coração', ['gui-zhi', 'gan-cao'],
    'Aquece e tonifica o Yang do Coração.', 'Palpitação que melhora apertando o peito, frio, cansaço. Costuma ser somada a outras fórmulas.', 'Palpitação exige avaliação cardiológica.', ['DefYgC']],
  ['shen-fu-tang', 'Shen Fu Tang', 'Decocção de Ginseng e Acônito', 'Fu Ren Liang Fang (Song)', 'Resgatar o Yang', ['ren-shen', 'fu-zi'],
    'Resgata o Yang e tonifica fortemente o Qi.', 'Colapso de Yang: suor frio, extremidades geladas, respiração fraca, pulso quase imperceptível.', 'SITUAÇÃO DE EMERGÊNCIA: encaminhar ao pronto-socorro. Contém Fu Zi (tóxica). Fórmula de referência histórica.', ['ColapsQiC']],
  ['tian-wang-bu-xin-dan', 'Tian Wang Bu Xin Dan', 'Elixir do Imperador Celeste que Tonifica o Coração', 'She Sheng Mi Pou (Ming)', 'Nutrir o Yin e acalmar', ['sheng-di-huang', 'xuan-shen', 'tian-men-dong', 'mai-men-dong', 'dan-shen', 'dang-gui', 'ren-shen', 'fu-ling', 'wu-wei-zi', 'yuan-zhi', 'bai-zi-ren', 'suan-zao-ren', 'jie-geng'],
    'Nutre o Yin e o Sangue do Coração e do Rim; acalma o Shen.', 'Insônia com muitos sonhos, ansiedade, palpitação, esquecimento, suor noturno, aftas, boca seca.', 'A receita tradicional leva Zhu Sha (cinábrio, que contém mercúrio): NÃO usar esse ingrediente. Dan Shen interage com anticoagulantes.', ['DefYnC']],
  ['an-shen-ding-zhi-wan', 'An Shen Ding Zhi Wan', 'Pílula que Acalma o Shen e Fortalece a Vontade', 'Yi Xue Xin Wu (Qing)', 'Acalmar o Shen', ['ren-shen', 'fu-ling', 'fu-shen', 'yuan-zhi', 'shi-chang-pu', 'long-gu'],
    'Tonifica o Qi do Coração e da Vesícula; acalma o Shen.', 'Medo fácil, sustos, timidez, indecisão, sono leve com sobressaltos, palpitação.', '', ['DefQiVB', 'DefQiC']],
  ['yi-wei-tang', 'Yi Wei Tang', 'Decocção que Beneficia o Estômago', 'Wen Bing Tiao Bian (Wu Ju-Tong)', 'Nutrir o Yin', ['sha-shen', 'mai-men-dong', 'sheng-di-huang', 'yu-zhu'],
    'Nutre o Yin do Estômago e gera líquidos.', 'Boca e garganta secas, fome sem vontade de comer, dor leve em queimação, prisão de ventre seca, língua sem saburra.', '', ['DefYnE']],
  ['sha-shen-mai-dong-tang', 'Sha Shen Mai Dong Tang', 'Decocção de Glehnia e Ofiopogon', 'Wen Bing Tiao Bian (Wu Ju-Tong)', 'Nutrir o Yin', ['sha-shen', 'mai-men-dong', 'yu-zhu', 'sang-ye', 'bai-bian-dou', 'gan-cao'],
    'Nutre o Yin do Pulmão e do Estômago.', 'Tosse seca, garganta seca, sede, depois de doenças febris.', '', ['DefYnP', 'DefYnE', 'SecP']],
  ['bai-he-gu-jin-tang', 'Bai He Gu Jin Tang', 'Decocção de Lírio que Firma o Metal', 'Yi Fang Ji Jie (Qing)', 'Nutrir o Yin', ['bai-he', 'sheng-di-huang', 'shu-di-huang', 'mai-men-dong', 'xuan-shen', 'bei-mu', 'jie-geng', 'bai-shao', 'dang-gui', 'gan-cao'],
    'Nutre o Yin do Pulmão e do Rim; acalma a tosse; transforma catarro.', 'Tosse seca crônica, às vezes com raias de sangue, garganta seca, calor nas palmas, suor noturno.', 'Tosse com sangue exige avaliação médica.', ['DefYnP']],
  ['bu-fei-tang', 'Bu Fei Tang', 'Decocção que Tonifica o Pulmão', 'Yong Lei Qian Fang (Yuan)', 'Tonificar o Qi', ['ren-shen', 'huang-qi', 'shu-di-huang', 'wu-wei-zi', 'zi-wan', 'sang-bai-pi'],
    'Tonifica o Qi do Pulmão e acalma a tosse.', 'Tosse fraca e crônica, falta de ar ao esforço, voz baixa, suor fácil, cansaço.', '', ['DefQiP']],
  ['yu-ping-feng-san', 'Yu Ping Feng San', 'Pó do Biombo de Jade', 'Shi Yi De Xiao Fang (Yuan)', 'Firmar o exterior', ['huang-qi', 'bai-zhu', 'fang-feng'],
    'Fortalece o Qi defensivo e firma o exterior.', 'Gripes e resfriados de repetição, suor fácil, rinite alérgica (prevenção, fora da crise).', 'Não usar durante a gripe ou infecção aguda.', ['DefQiP']],
  ['jin-suo-gu-jing-wan', 'Jin Suo Gu Jing Wan', 'Pílula da Fechadura de Ouro que Firma a Essência', 'Yi Fang Ji Jie (Qing)', 'Adstringir', ['sha-yuan-zi', 'qian-shi', 'lian-xu', 'long-gu', 'mu-li', 'lian-zi'],
    'Firma o Rim e contém a essência.', 'Perdas seminais, ejaculação precoce, corrimento crônico, fraqueza lombar.', 'Evitar se houver umidade-calor.', ['DefQiR']],
  ['suo-quan-wan', 'Suo Quan Wan', 'Pílula que Fecha a Fonte', 'Fu Ren Liang Fang (Song)', 'Adstringir', ['wu-yao', 'yi-zhi-ren', 'shan-yao'],
    'Aquece o Rim e contém a urina.', 'Urina frequente e clara, enurese noturna, incontinência por frio e fraqueza do Rim.', '', ['DefQiR']],
  ['xiao-yao-san', 'Xiao Yao San', 'Pó do Andarilho Livre', 'He Ji Ju Fang (Song)', 'Harmonizar Fígado e Baço', ['chai-hu', 'dang-gui', 'bai-shao', 'bai-zhu', 'fu-ling', 'gan-cao', 'bo-he', 'sheng-jiang'],
    'Desfaz a estagnação do Fígado, nutre o Sangue e fortalece o Baço.', 'Irritação, suspiros, TPM, mamas doloridas, menstruação irregular, cansaço, digestão fraca. Uma das fórmulas mais usadas.', 'Com calor (irritação forte, boca amarga) usa-se a versão com Mu Dan Pi e Zhi Zi (Jia Wei Xiao Yao San).', ['EstgQiF']],
  ['chai-hu-shu-gan-san', 'Chai Hu Shu Gan San', 'Pó de Bupleuro que Libera o Fígado', 'Jing Yue Quan Shu (Zhang Jing-Yue)', 'Mover o Qi', ['chai-hu', 'chen-pi', 'chuan-xiong', 'xiang-fu', 'zhi-ke', 'bai-shao', 'gan-cao'],
    'Libera o Qi do Fígado e alivia a dor.', 'Dor e distensão nas costelas, peito apertado, suspiros, irritação, dor que piora com emoções.', 'Evitar na gestação (Chuan Xiong, Zhi Ke).', ['EstgQiF']],
  ['tian-tai-wu-yao-san', 'Tian Tai Wu Yao San', 'Pó de Lindera de Tian Tai', 'Yi Xue Fa Ming (Li Dong-Yuan)', 'Mover o Qi', ['wu-yao', 'mu-xiang', 'xiao-hui-xiang', 'qing-pi', 'gao-liang-jiang', 'bing-lang', 'chuan-lian-zi', 'ba-dou'],
    'Move o Qi, dispersa o frio e alivia a dor do baixo ventre.', 'Dor e distensão no baixo ventre que irradia para os testículos (hérnia por frio), cólica intestinal por frio.', 'O Ba Dou serve só para tostar o Chuan Lian Zi e é descartado. Contém Bing Lang e Chuan Lian Zi: uso curto. Dor abdominal forte exige avaliação médica.', ['ObstID']],
  ['xue-fu-zhu-yu-tang', 'Xue Fu Zhu Yu Tang', 'Decocção que Expulsa a Estase da Mansão do Sangue', 'Yi Lin Gai Cuo (Wang Qing-Ren)', 'Mover o Sangue', ['tao-ren', 'hong-hua', 'dang-gui', 'sheng-di-huang', 'chuan-xiong', 'chi-shao', 'niu-xi', 'jie-geng', 'chai-hu', 'zhi-ke', 'gan-cao'],
    'Move o Sangue no peito e libera o Qi do Fígado.', 'Dor fixa e em pontada no peito, dor de cabeça crônica, insônia teimosa, irritação, lábios arroxeados.', 'Proibida na gestação; interage com anticoagulantes. Dor no peito exige avaliação cardiológica.', ['EstgXueC', 'EstgXueF']],
  ['ge-xia-zhu-yu-tang', 'Ge Xia Zhu Yu Tang', 'Decocção que Expulsa a Estase de Baixo do Diafragma', 'Yi Lin Gai Cuo (Wang Qing-Ren)', 'Mover o Sangue', ['wu-ling-zhi', 'dang-gui', 'chuan-xiong', 'tao-ren', 'mu-dan-pi', 'chi-shao', 'wu-yao', 'yan-hu-suo', 'gan-cao', 'xiang-fu', 'hong-hua', 'zhi-ke'],
    'Move o Sangue no abdômen e alivia a dor.', 'Dor fixa nas costelas e no abdômen, massas palpáveis, cólica menstrual com coágulos escuros.', 'Proibida na gestação; interage com anticoagulantes. Massas abdominais exigem avaliação médica.', ['EstgXueF']],
  ['tian-ma-gou-teng-yin', 'Tian Ma Gou Teng Yin', 'Decocção de Gastródia e Uncária', 'Za Bing Zheng Zhi Xin Yi (moderna)', 'Acalmar o vento interno', ['tian-ma', 'gou-teng', 'shi-jue-ming', 'zhi-zi', 'huang-qin', 'niu-xi', 'du-zhong', 'yi-mu-cao', 'sang-ji-sheng', 'ye-jiao-teng', 'fu-shen'],
    'Acalma o Yang do Fígado, apaga o vento e clareia calor; nutre Fígado e Rim.', 'Dor de cabeça latejante, tontura, zumbido, irritação, insônia, pressão alta.', 'Contém Niu Xi e Yi Mu Cao: proibida na gestação. Pressão alta exige acompanhamento médico.', ['AscYgF', 'VtF']],
  ['zhen-gan-xi-feng-tang', 'Zhen Gan Xi Feng Tang', 'Decocção que Acalma o Fígado e Apaga o Vento', 'Yi Xue Zhong Zhong Can Xi Lu (Zhang Xi-Chun)', 'Acalmar o vento interno', ['niu-xi', 'dai-zhe-shi', 'long-gu', 'mu-li', 'gui-ban', 'bai-shao', 'xuan-shen', 'tian-men-dong', 'chuan-lian-zi', 'mai-ya', 'yin-chen', 'gan-cao'],
    'Acalma o Fígado, apaga o vento, nutre o Yin e ancora o Yang.', 'Tontura forte, dor de cabeça com sensação de calor, rosto vermelho, zumbido; risco de “vento” (tremores, desvio da boca).', 'Desvio de boca, fraqueza de um lado ou fala enrolada são sinais de AVC: EMERGÊNCIA médica. Proibida na gestação.', ['VtF', 'AscYgF']],
  ['long-dan-xie-gan-tang', 'Long Dan Xie Gan Tang', 'Decocção de Genciana que Drena o Fígado', 'Yi Fang Ji Jie (Qing)', 'Clarear calor', ['long-dan-cao', 'huang-qin', 'zhi-zi', 'ze-xie', 'mu-tong', 'che-qian-zi', 'dang-gui', 'sheng-di-huang', 'chai-hu', 'gan-cao'],
    'Drena o Fogo do Fígado e da Vesícula e a umidade-calor do Aquecedor Inferior.', 'Dor de cabeça forte, olhos vermelhos, boca amarga, irritação; ou corrimento amarelo, coceira e ardor genital, urina escura.', 'Muito fria: uso curto. Usar só Mu Tong de Akebia (nunca Guan Mu Tong). Evitar na gestação.', ['FgF', 'UmdCalorF']],
  ['yin-chen-hao-tang', 'Yin Chen Hao Tang', 'Decocção de Artemísia Capilar', 'Shang Han Lun (Zhang Zhong-Jing)', 'Drenar umidade-calor', ['yin-chen', 'zhi-zi', 'da-huang'],
    'Drena umidade-calor do Fígado e da Vesícula; trata a icterícia.', 'Icterícia de cor viva, urina escura, prisão de ventre, sensação de plenitude.', 'Icterícia exige avaliação médica. Contém Da Huang: proibida na gestação.', ['UmdCalorF', 'UmdCalorBP']],
  ['xie-xin-tang', 'Xie Xin Tang', 'Decocção que Drena o Coração', 'Jin Gui Yao Lue (Zhang Zhong-Jing)', 'Clarear calor', ['da-huang', 'huang-lian', 'huang-qin'],
    'Drena o Fogo e clareia toxinas.', 'Fogo no Coração: inquietação, insônia, rosto vermelho, aftas, sangramento por calor, prisão de ventre.', 'Muito fria e purgativa: uso curto. Proibida na gestação.', ['FgC']],
  ['dao-chi-san', 'Dao Chi San', 'Pó que Conduz o Vermelho', 'Xiao Er Yao Zheng Zhi Jue (Qian Yi)', 'Clarear calor', ['sheng-di-huang', 'mu-tong', 'dan-zhu-ye', 'gan-cao'],
    'Clareia o calor do Coração e o leva para fora pela urina (Intestino Delgado).', 'Aftas e feridas na língua, inquietação, urina escura e com ardor.', 'Usar só Mu Tong de Akebia (nunca Guan Mu Tong).', ['CalorID', 'FgC']],
  ['qing-wei-san', 'Qing Wei San', 'Pó que Clareia o Estômago', 'Pi Wei Lun (Li Dong-Yuan)', 'Clarear calor', ['huang-lian', 'sheng-ma', 'sheng-di-huang', 'mu-dan-pi', 'dang-gui'],
    'Clareia o calor do Estômago e esfria o Sangue.', 'Dor de dente, gengiva inflamada ou sangrando, mau hálito, fome excessiva, boca seca.', 'Evitar no frio do Baço; Mu Dan Pi — evitar na gestação.', ['CalorE']],
  ['wen-dan-tang', 'Wen Dan Tang', 'Decocção que Aquece a Vesícula Biliar', 'San Yin Ji Yi Bing Zheng Fang Lun (Song)', 'Transformar catarro', ['ban-xia', 'zhu-ru', 'zhi-ke', 'chen-pi', 'fu-ling', 'gan-cao', 'sheng-jiang', 'da-zao'],
    'Transforma catarro, clareia a Vesícula e harmoniza o Estômago; acalma.', 'Insônia, sustos, inquietação, náusea, tontura, palpitação com catarro. Com Huang Lian (Huang Lian Wen Dan Tang) trata o Fleuma-Fogo no Coração.', 'Ban Xia só preparada; evitar na gestação.', ['FlmC', 'DefQiVB']],
  ['qing-qi-hua-tan-wan', 'Qing Qi Hua Tan Wan', 'Pílula que Clareia o Qi e Transforma o Catarro', 'Yi Fang Kao (Ming)', 'Transformar catarro-calor', ['dan-nan-xing', 'gua-lou', 'huang-qin', 'chen-pi', 'xing-ren', 'zhi-ke', 'fu-ling', 'ban-xia'],
    'Clareia o calor e transforma o catarro do Pulmão.', 'Tosse com catarro amarelo e grosso, peito cheio, falta de ar.', 'Febre alta ou falta de ar intensa exigem avaliação médica. Evitar na gestação.', ['FlmCalorP']],
  ['er-chen-tang', 'Er Chen Tang', 'Decocção das Duas Antigas', 'He Ji Ju Fang (Song)', 'Transformar catarro', ['ban-xia', 'chen-pi', 'fu-ling', 'gan-cao', 'sheng-jiang', 'wu-mei'],
    'Seca a umidade, transforma o catarro e harmoniza o centro. Base de todas as fórmulas de catarro.', 'Tosse com muito catarro branco, náusea, estufamento, tontura.', 'Evitar na tosse seca por deficiência de Yin; Ban Xia só preparada.', ['FlmFrioP', 'UmdFrioBP']],
  ['ling-gan-wu-wei-jiang-xin-tang', 'Ling Gan Wu Wei Jiang Xin Tang', 'Decocção de Poria, Alcaçuz, Esquisandra, Gengibre e Asaro', 'Jin Gui Yao Lue (Zhang Zhong-Jing)', 'Aquecer e transformar catarro', ['fu-ling', 'gan-cao', 'wu-wei-zi', 'sheng-jiang', 'xi-xin'],
    'Aquece o Pulmão e transforma o catarro ralo e frio.', 'Tosse com catarro abundante, branco e ralo, peito apertado, piora com frio.', 'Contém Xi Xin (só raiz, dose baixa). Evitar com calor.', ['FlmFrioP']],
  ['sang-xing-tang', 'Sang Xing Tang', 'Decocção de Folha de Amoreira e Semente de Damasco', 'Wen Bing Tiao Bian (Wu Ju-Tong)', 'Umedecer a secura', ['sang-ye', 'xing-ren', 'sha-shen', 'bei-mu', 'dan-dou-chi', 'zhi-zi'],
    'Libera a secura-calor e umedece o Pulmão.', 'Tosse seca ou com pouco catarro grudento, garganta e nariz secos, sede leve (tempo seco).', '', ['SecP']],
  ['qing-zao-jiu-fei-tang', 'Qing Zao Jiu Fei Tang', 'Decocção que Clareia a Secura e Resgata o Pulmão', 'Yi Men Fa Lu (Yu Chang)', 'Umedecer a secura', ['sang-ye', 'shi-gao', 'mai-men-dong', 'ren-shen', 'e-jiao', 'xing-ren', 'pi-pa-ye', 'gan-cao'],
    'Clareia a secura e o calor e nutre o Pulmão.', 'Tosse seca forte, falta de ar, garganta e boca secas, irritação.', 'Contém E Jiao (animal).', ['SecP', 'DefYnP']],
  ['bao-he-wan', 'Bao He Wan', 'Pílula que Preserva a Harmonia', 'Dan Xi Xin Fa (Zhu Dan-Xi)', 'Desfazer a retenção de alimentos', ['shan-zha', 'shen-qu', 'lai-fu-zi', 'ban-xia', 'chen-pi', 'fu-ling', 'lian-qiao'],
    'Desfaz os alimentos retidos e harmoniza o Estômago.', 'Plenitude e dor no estômago depois de comer demais, arrotos com cheiro de comida, náusea, diarreia ou prisão de ventre.', 'Para uso curto; Ban Xia só preparada.', ['AlimE']],
  ['liang-fu-wan', 'Liang Fu Wan', 'Pílula de Galanga e Tiririca', 'Liang Fang Ji Ye (Qing)', 'Aquecer e mover o Qi', ['gao-liang-jiang', 'xiang-fu'],
    'Aquece o Estômago, move o Qi e alivia a dor.', 'Dor no estômago por frio, que melhora com calor, às vezes ligada a emoções.', 'Evitar com calor.', ['FrioE']],
  ['xuan-fu-dai-zhe-tang', 'Xuan Fu Dai Zhe Tang', 'Decocção de Ínula e Hematita', 'Shang Han Lun (Zhang Zhong-Jing)', 'Fazer descer o Qi', ['xuan-fu-hua', 'dai-zhe-shi', 'ren-shen', 'sheng-jiang', 'ban-xia', 'gan-cao', 'da-zao'],
    'Faz descer o Qi rebelde do Estômago, transforma catarro e tonifica o Qi.', 'Arrotos persistentes, soluço, náusea e vômito, estufamento.', 'Dai Zhe Shi (mineral) e Ban Xia: evitar na gestação.', ['RebelE']],
  ['wu-mei-wan', 'Wu Mei Wan', 'Pílula de Ameixa Defumada', 'Shang Han Lun (Zhang Zhong-Jing)', 'Acalmar parasitas', ['wu-mei', 'xi-xin', 'sheng-jiang', 'huang-lian', 'dang-gui', 'fu-zi', 'hua-jiao', 'gui-zhi', 'ren-shen', 'huang-bai'],
    'Acalma os parasitas (áscaris), aquece o centro e clareia calor.', 'Dor abdominal em cólica por parasitas, vômito, extremidades frias; também diarreia crônica mista (frio e calor).', 'Contém Fu Zi e Xi Xin (tóxicas): proibida na gestação. Parasitoses devem ser confirmadas e tratadas com o médico.', ['Parasita']],
  ['ba-zheng-san', 'Ba Zheng San', 'Pó dos Oito Corretos', 'He Ji Ju Fang (Song)', 'Drenar umidade-calor', ['mu-tong', 'che-qian-zi', 'bian-xu', 'qu-mai', 'hua-shi', 'zhi-zi', 'da-huang', 'gan-cao'],
    'Clareia o calor e drena a umidade da Bexiga; facilita a urina.', 'Ardor e dor ao urinar, urina escura, frequente e em pouca quantidade (cistite).', 'Infecção urinária com febre ou dor lombar exige avaliação médica. Proibida na gestação. Usar só Mu Tong de Akebia.', ['UmdCalorB']],
  ['bi-xie-fen-qing-yin', 'Bi Xie Fen Qing Yin', 'Decocção de Dioscorea que Separa o Claro do Turvo', 'Dan Xi Xin Fa (Zhu Dan-Xi)', 'Drenar umidade', ['bi-xie', 'yi-zhi-ren', 'wu-yao', 'shi-chang-pu'],
    'Aquece o Rim, drena a umidade e separa o claro do turvo.', 'Urina turva ou leitosa, frequente, gotejamento, por frio e umidade.', '', ['UmdFrioB']],
  ['wu-ling-san', 'Wu Ling San', 'Pó dos Cinco com Poria', 'Shang Han Lun (Zhang Zhong-Jing)', 'Drenar umidade', ['ze-xie', 'fu-ling', 'zhu-ling', 'bai-zhu', 'gui-zhi'],
    'Promove a urina, drena a umidade e aquece o Yang.', 'Retenção de líquidos, edema, urina escassa, sede com vômito depois de beber.', '', ['UmdFrioB', 'UmdFrioBP']],
  ['lian-po-yin', 'Lian Po Yin', 'Decocção de Copte e Magnólia', 'Huo Luan Lun (Wang Meng-Ying)', 'Drenar umidade-calor', ['huang-lian', 'hou-po', 'shi-chang-pu', 'ban-xia', 'dan-dou-chi', 'zhi-zi', 'lu-gen'],
    'Clareia o calor, transforma a umidade e harmoniza o Estômago.', 'Vômito e diarreia por umidade-calor, peito e estômago cheios, sede sem vontade de beber.', 'Desidratação exige avaliação médica. Evitar na gestação.', ['UmdCalorBP']],
  ['ge-gen-qin-lian-tang', 'Ge Gen Qin Lian Tang', 'Decocção de Kudzu, Escutelária e Copte', 'Shang Han Lun (Zhang Zhong-Jing)', 'Clarear umidade-calor', ['ge-gen', 'huang-qin', 'huang-lian', 'gan-cao'],
    'Clareia o calor do intestino e para a diarreia.', 'Diarreia com calor e mau cheiro, ardor no ânus, febre, sede.', 'Diarreia com sangue, febre alta ou desidratação exigem avaliação médica.', ['UmdCalorIG']],
  ['bai-tou-weng-tang', 'Bai Tou Weng Tang', 'Decocção de Pulsatila', 'Shang Han Lun (Zhang Zhong-Jing)', 'Clarear calor e toxinas', ['bai-tou-weng', 'huang-bai', 'huang-lian', 'qin-pi'],
    'Clareia calor e toxinas e esfria o Sangue do intestino.', 'Disenteria: diarreia com sangue e muco, tenesmo, ardor no ânus.', 'Diarreia com sangue exige avaliação médica.', ['UmdCalorIG']],
  ['ping-wei-san', 'Ping Wei San', 'Pó que Equilibra o Estômago', 'He Ji Ju Fang (Song)', 'Secar a umidade', ['cang-zhu', 'hou-po', 'chen-pi', 'gan-cao'],
    'Seca a umidade, move o Qi e harmoniza o Estômago.', 'Estômago estufado, peso no corpo, falta de apetite, náusea, fezes moles, saburra branca e grossa.', 'Evitar na deficiência de Yin; Hou Po — cuidado na gestação.', ['UmdFrioBP']],
  ['huo-xiang-zheng-qi-san', 'Huo Xiang Zheng Qi San', 'Pó de Patchouli que Corrige o Qi', 'He Ji Ju Fang (Song)', 'Transformar umidade', ['huo-xiang', 'zi-su-ye', 'bai-zhi', 'da-fu-pi', 'fu-ling', 'bai-zhu', 'ban-xia', 'chen-pi', 'hou-po', 'jie-geng', 'gan-cao', 'sheng-jiang', 'da-zao'],
    'Libera o exterior, transforma a umidade e harmoniza o centro.', 'Gripe de estômago: vômito e diarreia com calafrio, enjoo de viagem, mal-estar no verão úmido.', 'Desidratação exige avaliação médica.', ['UmdFrioIG', 'UmdFrioBP']],
  ['yin-qiao-san', 'Yin Qiao San', 'Pó de Madressilva e Forsítia', 'Wen Bing Tiao Bian (Wu Ju-Tong)', 'Liberar o exterior (calor)', ['jin-yin-hua', 'lian-qiao', 'jie-geng', 'niu-bang-zi', 'bo-he', 'dan-dou-chi', 'jing-jie', 'dan-zhu-ye', 'lu-gen', 'gan-cao'],
    'Libera o vento-calor e clareia calor e toxinas.', 'Início de gripe com febre, dor de garganta, sede, pouco calafrio.', 'Cozimento curto. Febre alta ou persistente exige avaliação médica.', ['VtCalorP']],
  ['sang-ju-yin', 'Sang Ju Yin', 'Decocção de Amoreira e Crisântemo', 'Wen Bing Tiao Bian (Wu Ju-Tong)', 'Liberar o exterior (calor)', ['sang-ye', 'ju-hua', 'xing-ren', 'lian-qiao', 'bo-he', 'jie-geng', 'lu-gen', 'gan-cao'],
    'Libera o vento-calor suave e acalma a tosse.', 'Início de resfriado com tosse, febre baixa, sede leve.', '', ['VtCalorP']],
  ['gui-zhi-tang', 'Gui Zhi Tang', 'Decocção de Ramo de Canela', 'Shang Han Lun (Zhang Zhong-Jing)', 'Liberar o exterior (frio)', ['gui-zhi', 'bai-shao', 'sheng-jiang', 'da-zao', 'gan-cao'],
    'Libera o exterior e harmoniza o Qi defensivo e nutritivo.', 'Resfriado com calafrio, suor leve, aversão ao vento, em pessoa mais fraca.', 'Evitar com calor (febre alta, garganta vermelha).', ['VtFrioP']],
  ['jing-fang-bai-du-san', 'Jing Fang Bai Du San', 'Pó de Esquizonepeta e Saposhnikovia que Vence Toxinas', 'She Sheng Zhong Miao Fang (Ming)', 'Liberar o exterior (frio)', ['jing-jie', 'fang-feng', 'qiang-huo', 'chai-hu', 'qian-hu', 'chuan-xiong', 'zhi-ke', 'fu-ling', 'jie-geng', 'gan-cao'],
    'Libera o vento-frio-umidade e alivia dores do corpo.', 'Resfriado com calafrio forte, sem suor, dor no corpo e na cabeça, nariz entupido.', '', ['VtFrioP']],
];

// Acrescentadas na revisão (Maciocia; apostila de remédios patenteados).
F.push(
  ['yue-ju-wan', 'Yue Ju Wan', 'Pílula que Alivia a Estagnação', 'Dan Xi Xin Fa (Zhu Dan-Xi)', 'Mover o Qi', ['xiang-fu', 'chuan-xiong', 'cang-zhu', 'zhi-zi', 'shen-qu'],
    'Move o Qi e desfaz as “seis estagnações” (Qi, Sangue, umidade, catarro, calor e alimentos).', 'Peito e estômago apertados, arrotos, azia, digestão parada, humor deprimido. Muito usada por Maciocia na estagnação do Qi do Fígado.', 'Evitar na gestação (Chuan Xiong, Shen Qu).', ['EstgQiF', 'AlimE']],
  ['ba-xian-chang-shou-wan', 'Ba Xian Chang Shou Wan', 'Pílula dos Oito Imortais da Longevidade (Mai Wei Di Huang Wan)', 'Yi Ji (Qing)', 'Tonificar o Yin', ['shu-di-huang', 'shan-yao', 'shan-zhu-yu', 'ze-xie', 'fu-ling', 'mu-dan-pi', 'mai-men-dong', 'wu-wei-zi'],
    'Nutre o Yin do Rim e do Pulmão.', 'Tosse seca crônica, falta de ar, suor noturno, sede, garganta seca, calor à tarde.', 'Evitar na diarreia e com catarro; Mu Dan Pi — evitar na gestação.', ['DefYnP', 'DefYnR']],
  ['ming-mu-di-huang-wan', 'Ming Mu Di Huang Wan', 'Pílula de Rehmannia que Clareia os Olhos', 'Shen Shi Yao Han (Ming)', 'Tonificar o Yin', ['sheng-di-huang', 'shan-yao', 'shan-zhu-yu', 'fu-ling', 'ze-xie', 'mu-dan-pi', 'gou-qi-zi', 'shi-jue-ming', 'bai-ji-li', 'bai-shao', 'dang-gui', 'ju-hua'],
    'Nutre o Yin do Fígado e do Rim e clareia os olhos.', 'Olhos secos e cansados, vista turva, sensação de areia nos olhos, lacrimejamento com vento, tontura.', 'Cuidado com Baço e Estômago fracos. Contraindicada na gestação.', ['DefXueF', 'DefYnR']],
);

// Síndromes novas da revisão com McDonald (Zang Fu Syndromes) e Maciocia
// (Fundamentos, cap. 32–42), 09/10/2026. A 1ª síndrome é aquela em que a
// fórmula é a principal.
F.push(
  ['yi-guan-jian', 'Yi Guan Jian', 'Decocção de Uma Ligação', 'Liu Zhou Yi Hua (Wei Zhi-Xiu, Qing)', 'Nutrir o Yin', ['sheng-di-huang', 'sha-shen', 'mai-men-dong', 'dang-gui', 'gou-qi-zi', 'chuan-lian-zi'],
    'Nutre o Yin do Fígado e do Rim e suaviza o Fígado.', 'Olhos secos, visão turva, dor surda nas costelas, boca e garganta secas, regurgitação ácida, língua vermelha e seca.', 'Evitar com umidade ou catarro. Chuan Lian Zi é levemente tóxico (dose baixa).', ['DefYnF']],
  ['tong-xie-yao-fang', 'Tong Xie Yao Fang', 'Fórmula Importante para Diarreia Dolorosa', 'Dan Xi Xin Fa (Zhu Dan-Xi)', 'Harmonizar Fígado e Baço', ['bai-zhu', 'bai-shao', 'chen-pi', 'fang-feng'],
    'Acalma o Fígado, fortalece o Baço e alivia a diarreia com dor.', 'Barriga que dói e solta com o nervoso, dor que melhora após evacuar, gases, alternância de prisão de ventre e diarreia.', '', ['FinvBP']],
  ['si-ni-san', 'Si Ni San', 'Pó dos Quatro Frios', 'Shang Han Lun (Zhang Zhong-Jing)', 'Harmonizar Fígado e Baço', ['chai-hu', 'zhi-ke', 'bai-shao', 'gan-cao'],
    'Libera o Qi preso do Fígado e harmoniza o Fígado com o Estômago e o Baço.', 'Dor e distensão nas costelas e no estômago, mãos frias por tensão, irritação.', 'Cuidado na deficiência de Yin.', ['FinvE', 'FinvBP']],
  ['di-tan-tang', 'Di Tan Tang', 'Decocção que Lava o Catarro', 'Ji Sheng Fang (Yan Yong-He, Song)', 'Transformar catarro', ['dan-nan-xing', 'ban-xia', 'zhi-ke', 'fu-ling', 'chen-pi', 'shi-chang-pu', 'ren-shen', 'zhu-ru', 'gan-cao', 'sheng-jiang'],
    'Transforma a Fleuma e abre os orifícios da Mente.', 'Confusão mental, fala arrastada, catarro na garganta, olhar distante (também sequela de AVC, sob cuidado médico).', 'Evitar com calor ou deficiência de Yin.', ['FlmMente']],
  ['ren-shen-hu-tao-tang', 'Ren Shen Hu Tao Tang', 'Decocção de Ginseng e Noz', 'Ji Sheng Fang (Yan Yong-He, Song)', 'Tonificar o Yang', ['ren-shen', 'hu-tao-ren', 'sheng-jiang'],
    'Tonifica o Pulmão e o Rim e ajuda o Rim a receber o Qi.', 'Asma e falta de ar crônicas que pioram com esforço, dificuldade de puxar o ar, voz fraca.', 'Evitar na asma aguda com catarro-calor.', ['RnaoRecQi']],
  ['nuan-gan-jian', 'Nuan Gan Jian', 'Decocção que Aquece o Fígado', 'Jing Yue Quan Shu (Zhang Jing-Yue, Ming)', 'Aquecer e mover o Qi', ['dang-gui', 'gou-qi-zi', 'xiao-hui-xiang', 'rou-gui', 'wu-yao', 'chen-xiang', 'fu-ling', 'sheng-jiang'],
    'Aquece o Fígado e o Rim, move o Qi e alivia a dor.', 'Dor e frio no baixo ventre, dor no escroto (hérnia) que melhora com calor, mãos e pés frios.', 'Evitar com calor.', ['FrioCanalF']],
  ['xiao-jian-zhong-tang', 'Xiao Jian Zhong Tang', 'Pequena Decocção que Fortalece o Centro', 'Shang Han Lun (Zhang Zhong-Jing)', 'Aquecer o centro', ['yi-tang', 'gui-zhi', 'bai-shao', 'sheng-jiang', 'da-zao', 'gan-cao'],
    'Aquece e fortalece o centro e alivia a dor espasmódica.', 'Dor abdominal surda que melhora com calor e pressão, cansaço, palpitações, falta de apetite.', 'Evitar no diabetes (maltose), com vômito ou calor.', ['DefFrioID', 'FrioE']],
  ['ma-zi-ren-wan', 'Ma Zi Ren Wan', 'Pílula de Semente de Cânhamo', 'Shang Han Lun (Zhang Zhong-Jing)', 'Umedecer a secura', ['huo-ma-ren', 'bai-shao', 'zhi-ke', 'da-huang', 'hou-po', 'xing-ren'],
    'Umedece o intestino, clareia o Calor e solta as fezes.', 'Prisão de ventre com fezes secas e duras, urina frequente, boca seca.', 'Contém ruibarbo: proibida na gestação; não usar por muito tempo.', ['CalorIG', 'SecIG']],
  ['run-chang-wan', 'Run Chang Wan', 'Pílula que Umedece o Intestino', 'Shen Shi Zun Sheng Shu (Ming)', 'Umedecer a secura', ['dang-gui', 'sheng-di-huang', 'huo-ma-ren', 'tao-ren', 'zhi-ke'],
    'Nutre o Sangue e os líquidos e umedece o intestino.', 'Prisão de ventre de idosos, pós-parto ou de pessoas magras e secas.', 'Tao Ren: evitar na gestação.', ['SecIG']],
  ['shi-xiao-san', 'Shi Xiao San', 'Pó do Sorriso Perdido', 'He Ji Ju Fang (Song)', 'Mover o Sangue', ['wu-ling-zhi', 'pu-huang'],
    'Move o Sangue, desfaz a estase e alivia a dor.', 'Dor fixa em pontada no estômago ou no baixo ventre, cólica menstrual com coágulos.', 'Proibida na gestação. Sangramento digestivo exige avaliação médica.', ['EstXueE', 'EstgXueF']],
  ['dan-shen-yin', 'Dan Shen Yin', 'Bebida de Sálvia', 'Shi Fang Ge Kuo (Chen Xiu-Yuan, Qing)', 'Mover o Sangue', ['dan-shen', 'tan-xiang', 'sha-ren'],
    'Move o Sangue e o Qi e alivia a dor no estômago e no peito.', 'Dor no estômago ou no peito em pontada, que piora à noite.', 'Interage com anticoagulantes.', ['EstXueE', 'EstgXueC']],
  ['qing-jing-san', 'Qing Jing San', 'Pó que Clareia a Menstruação', 'Fu Qing Zhu Nu Ke (Fu Qing-Zhu, Qing)', 'Clarear calor', ['mu-dan-pi', 'di-gu-pi', 'bai-shao', 'shu-di-huang', 'qing-hao', 'huang-bai', 'fu-ling'],
    'Clareia o Calor do Sangue e regula a menstruação.', 'Menstruação adiantada e abundante, sangue vermelho vivo, sensação de calor, sede.', 'Evitar no frio.', ['CalorXue']],
  ['ban-xia-hou-po-tang', 'Ban Xia Hou Po Tang', 'Decocção de Pinellia e Magnólia', 'Jin Gui Yao Lue (Zhang Zhong-Jing)', 'Mover o Qi', ['ban-xia', 'hou-po', 'fu-ling', 'sheng-jiang', 'zi-su-ye'],
    'Move o Qi, faz descer o Qi rebelde e transforma o catarro.', 'Sensação de caroço na garganta, aperto no peito, suspiros, tosse com catarro, ansiedade.', 'Evitar na deficiência de Yin com secura.', ['EstgQiC', 'EstgQiF']],
  ['xie-bai-san', 'Xie Bai San', 'Pó que Drena o Branco', 'Xiao Er Yao Zheng Zhi Jue (Qian Yi, Song)', 'Clarear calor', ['sang-bai-pi', 'di-gu-pi', 'gan-cao', 'geng-mi'],
    'Clareia o Calor do Pulmão e acalma a tosse.', 'Tosse com calor, falta de ar, pele quente que piora à tarde.', 'Evitar na tosse por vento-frio.', ['CalorP']],
  ['ba-zhen-tang', 'Ba Zhen Tang', 'Decocção dos Oito Tesouros', 'Zheng Ti Lei Yao (Ming)', 'Tonificar Qi e Sangue', ['ren-shen', 'bai-zhu', 'fu-ling', 'gan-cao', 'shu-di-huang', 'dang-gui', 'bai-shao', 'chuan-xiong'],
    'Tonifica o Qi e o Sangue (Si Jun Zi Tang + Si Wu Tang).', 'Palidez, cansaço, falta de ar, palpitações, tontura, menstruação escassa.', 'Evitar com calor ou umidade.', ['DefXueBP', 'DefXueF', 'DefQiBP']],
  ['dan-zhi-xiao-yao-san', 'Dan Zhi Xiao Yao San', 'Pó do Andarilho Livre com Peônia e Gardênia', 'Nei Ke Zhai Yao (Xue Ji, Ming)', 'Harmonizar Fígado e Baço', ['chai-hu', 'dang-gui', 'bai-shao', 'bai-zhu', 'fu-ling', 'gan-cao', 'bo-he', 'sheng-jiang', 'mu-dan-pi', 'zhi-zi'],
    'Desfaz a estagnação do Fígado, clareia o Calor e nutre o Sangue.', 'Irritação forte, boca amarga, calor, TPM intensa, menstruação adiantada, mamas doloridas.', 'Mu Dan Pi: evitar na gestação.', ['CalorQiF', 'CalorXue']],
);

// Fórmulas que já existiam e servem também para as síndromes novas.
const MAIS = {
  'ming-mu-di-huang-wan': ['DefYnF'], 'xiao-yao-san': ['FinvBP'], 'chai-hu-shu-gan-san': ['FinvE', 'CalorQiF'],
  'wen-dan-tang': ['FlmMente', 'DefQiVB'], 'ba-xian-chang-shou-wan': ['RnaoRecQi'], 'jin-gui-shen-qi-wan': ['RnaoRecQi', 'DefFrioB'],
  'tian-tai-wu-yao-san': ['FrioCanalF'], 'li-zhong-wan': ['DefFrioID'], 'gui-pi-tang': ['DefXueBP'], 'lian-po-yin': ['UmdCalorE'],
  'suo-quan-wan': ['DefFrioB'], 'xuan-fu-dai-zhe-tang': ['FinvE'], 'an-shen-ding-zhi-wan': ['DefQiVB'],
};
for (const row of F) if (MAIS[row[0]]) for (const s of MAIS[row[0]]) if (!row[9].includes(s)) row[9].push(s);

const NOTAS = {
  'chai-hu-shu-gan-san': 'Maciocia a chama de Chai Hu Shu Gan Tang (decocção).',
  'wu-ling-san': 'Evitar na gestação (apostila de remédios patenteados).',
};
for (const row of F) if (NOTAS[row[0]]) row[8] = (row[8] ? row[8] + ' ' : '') + NOTAS[row[0]];

const formulas = F.map(([id, pinyin, nome, origem, categoria, ervasF, acao, indicacoes, cuidados, sindromes]) => {
  for (const e of ervasF) if (!ervas[e]) throw new Error(`erva desconhecida ${e} em ${id}`);
  return { id, pinyin, nome, origem, categoria, ervas: ervasF, acao, indicacoes, cuidados, sindromes };
});

const out = {
  aviso: 'Fitoterapia Chinesa segundo a MTC: conteúdo de apoio ao terapeuta habilitado, resumido a partir das fórmulas clássicas. Não substitui avaliação médica. Doses, preparo e duração são definidos pelo terapeuta. Ervas chinesas podem interagir com remédios e algumas são tóxicas: confira as contraindicações de cada fórmula. Verifique a regularidade do produto junto à Anvisa. Conteúdo a ser revisado pelo terapeuta.',
  fontes: [
    'BENSKY, Dan; GAMBLE, Andrew (com KAPTCHUK, Ted). Chinese Herbal Medicine: Materia Medica. Ed. revista. Seattle: Eastland Press — natureza, sabor e cuidados das ervas conferidos nesta obra.',
    'MACIOCIA, Giovanni. A Prática da Medicina Chinesa. São Paulo: Roca — ligações entre síndromes e fórmulas conferidas nesta obra.',
    'OLIVEIRA, Ana Sofia Meneses. Fitoterapia Chinesa. Dissertação (Mestrado em Ciências Farmacêuticas) — Universidade Fernando Pessoa, Porto, 2016.',
    'MIYAMOTO, Marcio Rodrigues. Fitoterapia Chinesa: Matéria Médica Chinesa Ilustrada – Um Guia Conciso. São Paulo: GTdE, 2016.',
    'Fitoterapia Chinesa – As síndromes mais comuns no Ocidente (apostila sobre remédios patenteados).',
    'Fórmulas clássicas: Shang Han Lun e Jin Gui Yao Lue (Zhang Zhong-Jing), He Ji Ju Fang (dinastia Song), Pi Wei Lun (Li Dong-Yuan), Wen Bing Tiao Bian (Wu Ju-Tong), Yi Lin Gai Cuo (Wang Qing-Ren) e outras indicadas em cada fórmula. Textos resumidos com nossas palavras; sem doses.',
  ],
  fundamentos: [
    { titulo: 'Propriedades de cada erva', itens: [
      'Natureza (quente, morna, neutra, fresca, fria): aquece ou esfria o corpo — trata-se o frio com ervas quentes e o calor com ervas frias.',
      'Sabor: picante dispersa e move; doce tonifica e harmoniza; ácido contém e segura; amargo seca e drena para baixo; salgado amolece e desce; insípido drena a umidade.',
      'Direção: subir, descer, ir para fora ou para dentro (ex.: ervas leves de flores sobem; minerais e sementes descem).',
      'Meridianos/órgãos: onde a erva age preferencialmente.',
    ] },
    { titulo: 'Como uma fórmula é montada', itens: [
      'Imperador (Jun): a erva principal, que trata a causa; costuma dar nome à fórmula.',
      'Ministro (Chen): reforça o imperador e trata sintomas secundários.',
      'Assistente (Zuo): ajuda, corrige excessos ou reduz a toxicidade das outras.',
      'Mensageiro (Shi): harmoniza (ex.: alcaçuz) e leva a fórmula ao lugar certo.',
    ] },
    { titulo: 'Formas de apresentação', itens: [
      'Tang: decocção (chá cozido). San: pó. Wan: pílula. Pian: comprimido. Dan: preparado que contém minerais. Gao: pasta ou emplastro. Os “remédios patenteados” (pílulas e comprimidos prontos) são versões práticas das fórmulas clássicas.',
    ] },
    { titulo: 'Os oito métodos de tratamento', itens: [
      'Suar (liberar o exterior), vomitar, purgar, aquecer, esfriar (clarear o calor), tonificar, dissolver acúmulos e harmonizar.',
    ] },
    { titulo: 'Segurança', itens: [
      'Na gestação, evitar fórmulas que movem o Qi com força, movem o Sangue ou purgam, além das ervas marcadas como proibidas.',
      'Na deficiência grave de Yin ou depois de perda de líquidos (vômito, diarreia, sangramento), evitar fórmulas que fazem suar.',
      'Ervas que interagem com anticoagulantes (Dang Gui, Dan Shen, Hong Hua, Tao Ren, Chuan Xiong, Gou Qi Zi, Ginseng): avise o médico do paciente.',
      'Ervas tóxicas (Fu Zi, Xi Xin, Ban Xia crua, Ba Dou, Mu Tong de Aristolochia) só preparadas, em dose baixa e por terapeuta experiente. Nunca usar cinábrio (Zhu Sha, mercúrio).',
      'A tradição lista incompatibilidades clássicas (“18 incompatibilidades”), por exemplo Gan Cao com Gan Sui, Da Ji ou Yuan Hua, e Li Lu (Veratrum) com Ginseng, Dang Shen, Sha Shen ou Dan Shen.',
      'Crianças precisam de dose reduzida pelo terapeuta. Prefira produtos de procedência confiável e regularizados na Anvisa.',
    ] },
  ],
  alertas: {
    gest: 'Evitar ou proibida na gestação',
    anticoag: 'Interage com anticoagulantes (ex.: varfarina)',
    pressao: 'Cuidado na pressão alta',
    toxica: 'Tóxica ou só preparada / dose baixa',
    animal: 'Contém ingrediente de origem animal',
    mineral: 'Mineral ou concha',
  },
  ervas,
  formulas,
};
writeFileSync(new URL('../src/data/fitoterapia.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
const sind = new Set(formulas.flatMap((f) => f.sindromes));
console.log(`${Object.keys(ervas).length} ervas, ${formulas.length} fórmulas, ${sind.size} síndromes cobertas`);
