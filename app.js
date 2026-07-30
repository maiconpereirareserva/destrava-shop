(() => {
  'use strict';

  const STORAGE_KEY = 'destravaShopStateV1';
  const defaultState = {
    product: {
      name: '', category: 'Casa e organização', duration: 30, problem: '', benefit: '',
      experience: '', audience: '', caveat: '', personalPhrase: ''
    },
    style: 'amigo',
    energy: 2,
    scenes: [],
    environmentChecks: {},
    stats: { scripts: 0, practices: 0, videos: 0, minutes: 0, streak: 0, lastPracticeDate: '' },
    recordedScenes: {},
    reviewChecks: [],
    theme: 'light'
  };

  let state = loadState();
  let currentTrainingIndex = 0;
  let mediaStream = null;
  let audioContext = null;
  let analyser = null;
  let animationFrame = null;
  let practiceStartedAt = 0;

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  const sectionTitles = {
    inicio: 'Início', produto: 'Produto', roteiro: 'Roteiro natural', ambiente: 'Ambiente',
    treino: 'Treino de voz', gravacao: 'Gravação', capcut: 'Editar no CapCut', revisao: 'Revisão'
  };

  const styleLabels = {
    amigo: 'Conversa com amigo', descoberta: 'Descoberta sincera', teste: 'Teste real',
    calmo: 'Calmo e direto', casal: 'Conversa em casal'
  };

  const styleOpeners = {
    amigo: [
      'Deixa eu te mostrar uma coisa que eu comecei a usar aqui em casa.',
      'Olha isso aqui, porque eu achei bem mais útil do que parecia.',
      'Sabe uma coisa simples que acaba facilitando a rotina? É isso aqui.'
    ],
    descoberta: [
      'Eu via esse produto e não entendia muito bem se valia a pena.',
      'Eu não esperava muita coisa disso aqui, mas resolvi testar.',
      'Achei que seria só mais uma coisa para ficar guardada, até usar de verdade.'
    ],
    teste: [
      'Eu queria saber se isso funcionava mesmo, então testei do jeito mais simples.',
      'Vamos testar isso aqui na prática, sem enrolação.',
      'Eu separei uma situação real para ver se esse produto realmente ajuda.'
    ],
    calmo: [
      'Vou mostrar de forma simples como esse produto funciona.',
      'Esse é um produto pequeno, mas pensado para resolver uma situação bem comum.',
      'Eu usei isso na minha rotina e quero mostrar o que realmente mudou.'
    ],
    casal: [
      'Ela me perguntou se isso aqui fazia diferença mesmo. Aí eu mostrei na prática.',
      'A gente resolveu testar isso juntos porque esse problema acontecia direto aqui em casa.',
      'Um de nós achou que não precisava. O outro resolveu testar. Olha no que deu.'
    ]
  };

  const energyWords = {
    1: { lead: 'sem pressa', intensifier: 'bem', ending: 'pode ser uma opção útil' },
    2: { lead: 'na prática', intensifier: 'realmente', ending: 'vale a pena conhecer' },
    3: { lead: 'e olha só', intensifier: 'muito', ending: 'pode facilitar bastante a rotina' }
  };

  function cloneDefault() {
    return JSON.parse(JSON.stringify(defaultState));
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return saved ? deepMerge(cloneDefault(), saved) : cloneDefault();
    } catch {
      return cloneDefault();
    }
  }

  function deepMerge(target, source) {
    Object.keys(source || {}).forEach(key => {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        target[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        target[key] = source[key];
      }
    });
    return target;
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateDashboard();
    updateProgress();
  }

  function randomOf(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function cleanText(text, fallback = '') {
    return (text || fallback).trim().replace(/[.!?]+$/, '');
  }

  function sentence(text) {
    const value = cleanText(text);
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1) + '.';
  }

  function lowerStart(text) {
    const value = cleanText(text);
    return value ? value.charAt(0).toLowerCase() + value.slice(1) : '';
  }

  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function navigate(sectionId) {
    $$('.page-section').forEach(section => section.classList.toggle('active', section.id === sectionId));
    $$('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.section === sectionId));
    $('#pageTitle').textContent = sectionTitles[sectionId] || 'Destrava Shop';
    $('#sidebar').classList.remove('open');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (sectionId === 'treino') renderTraining();
    if (sectionId === 'gravacao') renderRecordingBoard();
    if (sectionId === 'capcut') renderCapCut();
    if (sectionId === 'revisao') updateReview();
  }

  function bindNavigation() {
    $$('[data-section]').forEach(button => button.addEventListener('click', () => navigate(button.dataset.section)));
    $$('[data-go]').forEach(button => button.addEventListener('click', () => navigate(button.dataset.go)));
    $('#menuToggle').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
    document.addEventListener('click', event => {
      if (window.innerWidth <= 820 && $('#sidebar').classList.contains('open') && !$('#sidebar').contains(event.target) && !$('#menuToggle').contains(event.target)) {
        $('#sidebar').classList.remove('open');
      }
    });
  }

  function hydrateForm() {
    const p = state.product;
    $('#productName').value = p.name;
    $('#productCategory').value = p.category;
    $('#videoDuration').value = String(p.duration);
    $('#productProblem').value = p.problem;
    $('#productBenefit').value = p.benefit;
    $('#productExperience').value = p.experience;
    $('#productAudience').value = p.audience;
    $('#productCaveat').value = p.caveat;
    $('#personalPhrase').value = p.personalPhrase;
    $('#energyRange').value = state.energy;
    $$('[data-style]').forEach(chip => chip.classList.toggle('active', chip.dataset.style === state.style));
    Object.entries(state.environmentChecks).forEach(([key, checked]) => {
      const input = $(`#environmentChecklist input[data-check="${key}"]`);
      if (input) input.checked = checked;
    });
    updateEnvironmentStatus();
  }

  function readProductForm() {
    state.product = {
      name: $('#productName').value.trim(),
      category: $('#productCategory').value,
      duration: Number($('#videoDuration').value),
      problem: $('#productProblem').value.trim(),
      benefit: $('#productBenefit').value.trim(),
      experience: $('#productExperience').value.trim(),
      audience: $('#productAudience').value.trim(),
      caveat: $('#productCaveat').value.trim(),
      personalPhrase: $('#personalPhrase').value.trim()
    };
  }

  function fillExample() {
    $('#productName').value = 'mini seladora portátil';
    $('#productCategory').value = 'Cozinha';
    $('#videoDuration').value = '30';
    $('#productProblem').value = 'os pacotes ficavam abertos e os alimentos perdiam a crocância';
    $('#productBenefit').value = 'ela é pequena, esquenta rápido e cabe em qualquer gaveta';
    $('#productExperience').value = 'testei em pacotes de biscoito e salgadinho e o fechamento ficou melhor do que eu esperava';
    $('#productAudience').value = 'quem quer organizar melhor a cozinha e evitar desperdício';
    $('#productCaveat').value = 'precisa colocar as pilhas e esperar alguns segundos antes de usar';
    $('#personalPhrase').value = 'olha essa coisinha, eu achei que não faria diferença, mas agora estou usando direto';
    showToast('Exemplo preenchido. Você pode alterar qualquer resposta.');
  }

  function validateProduct() {
    const p = state.product;
    return p.name && p.problem && p.benefit && p.experience;
  }

  function normalizePersonalOpener() {
    const phrase = cleanText(state.product.personalPhrase);
    if (!phrase) return randomOf(styleOpeners[state.style]);
    return phrase.charAt(0).toUpperCase() + phrase.slice(1) + '.';
  }

  function generateScenes() {
    if (!validateProduct()) {
      showToast('Preencha nome, problema, benefício e experiência do produto.');
      navigate('produto');
      return;
    }

    const p = state.product;
    const energy = energyWords[state.energy] || energyWords[2];
    const duration = Number(p.duration) || 30;
    const opener = normalizePersonalOpener();
    const problem = lowerStart(p.problem);
    const benefit = lowerStart(p.benefit);
    const experience = lowerStart(p.experience);
    const audience = lowerStart(p.audience || 'quem passa por esse mesmo problema');
    const caveat = lowerStart(p.caveat);
    let scenes;

    if (duration <= 15) {
      scenes = [
        scene('Gancho', 3, 'Mostre o produto já em uso ou bem perto da câmera.', opener),
        scene('Demonstração', 8, `Mostre o problema e use o produto sem cortar a ação principal.`, `Aqui o problema era que ${problem}. Eu testei e ${experience}.`),
        scene('Opinião', 4, 'Mostre o resultado final e deixe o produto centralizado.', `O que me ganhou foi que ${benefit}. Para ${audience}, ${energy.ending}.`)
      ];
    } else if (duration <= 30) {
      scenes = [
        scene('Gancho', 4, 'Comece com o produto próximo da câmera e uma ação acontecendo.', opener),
        scene('Situação real', 6, 'Mostre rapidamente o problema antes do produto.', `Aqui em casa acontecia direto: ${problem}.`),
        scene('Demonstração', 10, 'Use o produto devagar o suficiente para a pessoa entender.', `Aí eu comecei a usar o ${p.name} e, ${energy.lead}, ${experience}.`),
        scene('O que chamou atenção', 6, 'Aproxime a câmera do detalhe mais importante.', `O que eu mais gostei é que ${benefit}.`),
        scene('Encerramento', 4, 'Mostre o resultado e finalize sem apontar ou pressionar.', caveat ? `Só fica a dica: ${caveat}. Para ${audience}, ${energy.ending}.` : `Para ${audience}, ${energy.ending}.`)
      ];
    } else {
      scenes = [
        scene('Gancho', 5, 'Mostre o produto e um detalhe que desperte curiosidade.', opener),
        scene('Contexto', 8, 'Mostre onde o problema costuma acontecer.', `Eu procurei uma solução porque ${problem}.`),
        scene('Primeiro teste', 10, 'Faça a primeira parte da demonstração em plano aberto.', `Quando eu testei o ${p.name}, percebi que ${experience}.`),
        scene('Detalhe', 9, 'Grave um close do mecanismo, textura, tamanho ou acabamento.', `O detalhe que mais fez diferença para mim foi que ${benefit}.`),
        scene('Opinião equilibrada', 8, 'Mostre o produto parado enquanto a narração continua.', caveat ? `Não vou dizer que é perfeito: ${caveat}. Mesmo assim, na minha rotina ajudou.` : `Não é sobre fazer mil promessas. É uma solução simples que ajudou na minha rotina.`),
        scene('Para quem serve', 7, 'Mostre uma segunda forma de uso ou o resultado final.', `Eu indicaria principalmente para ${audience}.`),
        scene('Encerramento', Math.max(3, duration - 47), 'Centralize o produto e encerre com uma frase curta.', `Se esse também é um problema por aí, ${energy.ending}.`)
      ];
    }

    if (state.style === 'casal') {
      scenes = scenes.map((item, index) => ({
        ...item,
        speech: index % 2 === 0 ? `Pessoa 1: ${item.speech}` : `Pessoa 2: ${item.speech}`
      }));
    }

    state.scenes = scenes;
    state.stats.scripts += 1;
    state.recordedScenes = {};
    currentTrainingIndex = 0;
    saveState();
    renderScript();
    renderRecordingBoard();
    renderCapCut();
    showToast('Roteiro natural criado. Leia em voz alta e ajuste o que não parecer seu.');
    navigate('roteiro');
  }

  function scene(title, seconds, instruction, speech) {
    return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, title, seconds, instruction, speech };
  }

  function simplifyScenes() {
    if (!state.scenes.length) return;
    state.scenes = state.scenes.map(item => ({
      ...item,
      speech: item.speech
        .replace(/Eu procurei uma solução porque/gi, 'Eu queria resolver isso porque')
        .replace(/O detalhe que mais fez diferença para mim foi que/gi, 'O que eu mais gostei foi que')
        .replace(/principalmente para/gi, 'para')
        .replace(/Mesmo assim, na minha rotina ajudou/gi, 'Mas aqui ajudou')
        .replace(/vale a pena conhecer/gi, 'vale dar uma olhada')
    }));
    saveState();
    renderScript();
    showToast('As frases foram simplificadas.');
  }

  function renderScript() {
    const hasScenes = state.scenes.length > 0;
    $('#scriptEmpty').classList.toggle('hidden', hasScenes);
    $('#scriptResult').classList.toggle('hidden', !hasScenes);
    if (!hasScenes) return;

    $('#scriptDurationBadge').textContent = `${state.product.duration} segundos`;
    $('#scriptStyleBadge').textContent = styleLabels[state.style];
    const list = $('#sceneList');
    list.innerHTML = state.scenes.map((item, index) => `
      <article class="scene-card">
        <div class="scene-head">
          <strong><span>${sceneEmoji(index)}</span> Cena ${index + 1} — ${escapeHtml(item.title)}</strong>
          <span class="scene-duration">${item.seconds}s</span>
        </div>
        <div class="scene-body">
          <div class="scene-instruction"><strong>O que gravar</strong><br>${escapeHtml(item.instruction)}</div>
          <div class="scene-speech" contenteditable="true" data-scene-speech="${index}" spellcheck="true">${escapeHtml(item.speech)}</div>
        </div>
        <div class="scene-actions"><button class="secondary-button compact" data-copy-scene="${index}">Copiar fala</button></div>
      </article>
    `).join('');

    $$('[data-scene-speech]').forEach(el => {
      el.addEventListener('blur', () => {
        const index = Number(el.dataset.sceneSpeech);
        state.scenes[index].speech = el.innerText.trim();
        saveState();
        renderRecordingBoard();
        renderCapCut();
      });
    });

    $$('[data-copy-scene]').forEach(button => button.addEventListener('click', () => {
      const item = state.scenes[Number(button.dataset.copyScene)];
      copyText(item.speech, 'Fala copiada.');
    }));
  }

  function sceneEmoji(index) {
    return ['👀', '🏠', '👐', '🔎', '💬', '🎯', '✅'][index] || '🎬';
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  function buildFullScript() {
    return state.scenes.map((item, index) => `CENA ${index + 1} — ${item.title} (${item.seconds}s)\nO que gravar: ${item.instruction}\nFala: ${item.speech}`).join('\n\n');
  }

  async function copyText(text, successMessage) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    showToast(successMessage);
  }

  function renderTraining() {
    if (!state.scenes.length) {
      $('#trainingSceneLabel').textContent = 'Sem roteiro';
      $('#trainingProgress').textContent = '0 de 0';
      $('#trainingText').textContent = 'Crie um roteiro para começar o treino.';
      return;
    }
    currentTrainingIndex = Math.max(0, Math.min(currentTrainingIndex, state.scenes.length - 1));
    const item = state.scenes[currentTrainingIndex];
    $('#trainingSceneLabel').textContent = `Cena ${currentTrainingIndex + 1}`;
    $('#trainingProgress').textContent = `${currentTrainingIndex + 1} de ${state.scenes.length}`;
    $('#trainingText').textContent = item.speech;
  }

  async function togglePractice() {
    const button = $('#recordPracticeBtn');
    if (mediaStream && analyser) {
      stopAudioMeter();
      const elapsed = Math.max(1, Math.round((Date.now() - practiceStartedAt) / 60000));
      state.stats.minutes += elapsed;
      button.textContent = '● Praticar';
      showToast('Prática encerrada.');
      saveState();
      return;
    }

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(mediaStream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      practiceStartedAt = Date.now();
      button.textContent = '■ Encerrar';
      updateVoiceMeter();
    } catch (error) {
      showToast('Não foi possível acessar o microfone. Verifique a permissão do navegador.');
    }
  }

  function updateVoiceMeter() {
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    const average = data.reduce((sum, value) => sum + value, 0) / data.length;
    const percent = Math.min(100, average * 1.7);
    $('#voiceLevel').style.width = `${percent}%`;
    $('#voiceFeedback').textContent = percent < 14 ? 'Fale um pouco mais alto ou aproxime o celular.' : percent > 82 ? 'O volume está muito alto. Afaste um pouco o celular.' : 'Volume adequado para uma fala clara.';
    animationFrame = requestAnimationFrame(updateVoiceMeter);
  }

  function stopAudioMeter() {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    if (mediaStream) mediaStream.getTracks().forEach(track => track.stop());
    if (audioContext) audioContext.close();
    mediaStream = null;
    audioContext = null;
    analyser = null;
    $('#voiceLevel').style.width = '0%';
    $('#voiceFeedback').textContent = 'Ative o microfone para medir.';
  }

  function completeTraining() {
    const checked = $$('.mission-check:checked').length;
    if (checked < 2) {
      showToast('Conclua pelo menos duas ações da missão.');
      return;
    }
    state.stats.practices += 1;
    updateStreak();
    saveState();
    showToast('Treino concluído. A repetição é o que reduz a insegurança.');
    $$('.mission-check').forEach(input => input.checked = false);
  }

  function updateStreak() {
    const today = new Date().toISOString().slice(0, 10);
    if (state.stats.lastPracticeDate === today) return;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    state.stats.streak = state.stats.lastPracticeDate === yesterday ? state.stats.streak + 1 : 1;
    state.stats.lastPracticeDate = today;
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      showToast('A câmera exige HTTPS ou localhost. No GitHub Pages funcionará normalmente.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      const video = $('#cameraVideo');
      video.srcObject = stream;
      await video.play();
      $('#cameraPreview').classList.add('active');
      $('#cameraPlaceholder').style.display = 'none';
      $('#startCameraBtn').disabled = true;
      $('#stopCameraBtn').disabled = false;
      $('#startCameraBtn').dataset.streamActive = 'true';
    } catch {
      showToast('Não foi possível abrir a câmera. Verifique a permissão do navegador.');
    }
  }

  function stopCamera() {
    const video = $('#cameraVideo');
    if (video.srcObject) video.srcObject.getTracks().forEach(track => track.stop());
    video.srcObject = null;
    $('#cameraPreview').classList.remove('active');
    $('#cameraPlaceholder').style.display = '';
    $('#startCameraBtn').disabled = false;
    $('#stopCameraBtn').disabled = true;
  }

  function updateEnvironmentStatus() {
    const inputs = $$('#environmentChecklist input');
    const checked = inputs.filter(input => input.checked).length;
    const status = $('#environmentStatus');
    const dot = $('.status-dot');
    if (checked === inputs.length && inputs.length) {
      status.textContent = 'Ambiente pronto para gravar.';
      dot.classList.add('complete');
    } else {
      status.textContent = `${checked} de ${inputs.length} verificações concluídas.`;
      dot.classList.remove('complete');
    }
  }

  function renderRecordingBoard() {
    const board = $('#recordingBoard');
    const empty = $('#recordingEmpty');
    const hasScenes = state.scenes.length > 0;
    board.classList.toggle('hidden', !hasScenes);
    empty.classList.toggle('hidden', hasScenes);
    if (!hasScenes) return;

    board.innerHTML = state.scenes.map((item, index) => `
      <article class="record-card">
        <div class="record-number">${String(index + 1).padStart(2, '0')}</div>
        <div>
          <h3>${escapeHtml(item.title)} <span class="pill neutral">${item.seconds}s</span></h3>
          <p><strong>Grave:</strong> ${escapeHtml(item.instruction)}</p>
          <blockquote>${escapeHtml(item.speech)}</blockquote>
          <p><small>Salve como: <strong>${String(index + 1).padStart(2, '0')}-${slugify(item.title)}.mp4</strong></small></p>
        </div>
        <div class="record-actions">
          <label><input type="checkbox" class="scene-done" data-recorded="${index}" ${state.recordedScenes[index] ? 'checked' : ''} aria-label="Marcar cena como gravada"></label>
          <button class="secondary-button compact" data-copy-record="${index}">Copiar</button>
        </div>
      </article>
    `).join('');

    $$('[data-recorded]').forEach(input => input.addEventListener('change', () => {
      state.recordedScenes[input.dataset.recorded] = input.checked;
      saveState();
    }));
    $$('[data-copy-record]').forEach(button => button.addEventListener('click', () => {
      const item = state.scenes[Number(button.dataset.copyRecord)];
      copyText(`${item.instruction}\n\n${item.speech}`, 'Orientação da cena copiada.');
    }));
  }

  function slugify(value) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toUpperCase();
  }

  function renderCapCut() {
    const timeline = $('#editTimeline');
    const texts = $('#onScreenTexts');
    if (!state.scenes.length) {
      timeline.innerHTML = '<p style="color:var(--muted)">Crie um roteiro para gerar a ordem de edição.</p>';
      texts.innerHTML = '<div class="screen-text-card">Os textos aparecerão aqui.</div>';
      return;
    }

    let elapsed = 0;
    timeline.innerHTML = state.scenes.map((item, index) => {
      const start = elapsed;
      elapsed += item.seconds;
      return `
        <div class="timeline-item">
          <div class="timeline-time">${formatTime(start)}–${formatTime(elapsed)}</div>
          <div class="timeline-content">
            <strong>${index + 1}. ${escapeHtml(item.title)}</strong>
            <p>${capCutInstruction(item, index)}</p>
            <small>Arquivo: ${String(index + 1).padStart(2, '0')}-${slugify(item.title)}.mp4</small>
          </div>
        </div>`;
    }).join('');

    const suggested = buildOnScreenTexts();
    texts.innerHTML = suggested.map(text => `<div class="screen-text-card">${escapeHtml(text)}</div>`).join('');
  }

  function formatTime(seconds) {
    return `0:${String(seconds).padStart(2, '0')}`;
  }

  function capCutInstruction(item, index) {
    if (index === 0) return 'Comece sem tela preta nem silêncio. Use um corte direto e uma legenda curta no primeiro segundo.';
    if (index === state.scenes.length - 1) return 'Faça um encerramento curto. Não prolongue a imagem depois que a fala terminar.';
    if (/demonstra|teste/i.test(item.title)) return 'Mantenha a ação principal visível. Use aproximação leve apenas no detalhe importante.';
    return 'Corte pausas longas e alterne plano aberto com detalhe para manter o vídeo dinâmico.';
  }

  function buildOnScreenTexts() {
    const p = state.product;
    return [
      `EU NÃO ESPERAVA ISSO DO ${p.name.toUpperCase()}`,
      `O PROBLEMA ERA: ${cleanText(p.problem).toUpperCase()}`,
      `TESTE REAL, SEM ENROLAÇÃO`,
      cleanText(p.benefit).toUpperCase(),
      p.audience ? `PARA ${cleanText(p.audience).toUpperCase()}` : 'UMA SOLUÇÃO SIMPLES PARA A ROTINA',
      'MINHA OPINIÃO DEPOIS DE USAR'
    ];
  }

  function buildEditPlan() {
    let elapsed = 0;
    return state.scenes.map((item, index) => {
      const start = elapsed;
      elapsed += item.seconds;
      return `${formatTime(start)}–${formatTime(elapsed)} | ${index + 1}. ${item.title}\n${capCutInstruction(item, index)}\nArquivo: ${String(index + 1).padStart(2, '0')}-${slugify(item.title)}.mp4`;
    }).join('\n\n');
  }

  function updateReview() {
    const checks = $$('#reviewChecklist input');
    checks.forEach((input, index) => input.checked = Boolean(state.reviewChecks[index]));
    const total = checks.length;
    const completed = checks.filter(input => input.checked).length;
    const percent = total ? Math.round((completed / total) * 100) : 0;
    $('#reviewScore').textContent = `${percent}%`;
    $('.score-ring').style.setProperty('--score', `${percent}%`);
    $('#reviewTitle').textContent = percent === 100 ? 'Vídeo pronto para publicar' : percent >= 63 ? 'Quase pronto' : 'Complete o processo';
    $('#reviewMessage').textContent = percent === 100 ? 'Todas as verificações principais foram concluídas.' : `Faltam ${total - completed} verificações antes da publicação.`;
    $('#finalScenes').textContent = state.scenes.length;
    $('#finalDuration').textContent = `${state.scenes.reduce((sum, item) => sum + item.seconds, 0)}s`;
    $('#finalChecks').textContent = `${completed}/${total}`;
  }

  function updateDashboard() {
    $('#metricScripts').textContent = state.stats.scripts;
    $('#metricPractices').textContent = state.stats.practices;
    $('#metricVideos').textContent = state.stats.videos;
    $('#metricMinutes').textContent = `${state.stats.minutes} min`;
    $('#streakValue').textContent = `${state.stats.streak} ${state.stats.streak === 1 ? 'dia' : 'dias'}`;
  }

  function updateProgress() {
    let points = 0;
    if (validateProduct()) points += 1;
    if (state.scenes.length) points += 1;
    if (Object.values(state.environmentChecks).filter(Boolean).length >= 4) points += 1;
    if (state.stats.practices > 0) points += 1;
    if (state.scenes.length && Object.values(state.recordedScenes).filter(Boolean).length === state.scenes.length) points += 1;
    if ($('#capcutChecklist') && $$('#capcutChecklist input:checked').length >= 4) points += 1;
    if (state.reviewChecks.filter(Boolean).length === 8) points += 1;
    const percent = Math.round((points / 7) * 100);
    $('#progressFill').style.width = `${percent}%`;
    $('#progressText').textContent = `${percent}%`;
  }

  function exportData() {
    const payload = JSON.stringify(state, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `destrava-shop-${new Date().toISOString().slice(0,10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Dados exportados.');
  }

  function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    saveState();
  }

  function applyTheme() {
    document.documentElement.dataset.theme = state.theme === 'dark' ? 'dark' : 'light';
    $('#themeToggle').textContent = state.theme === 'dark' ? '☀️' : '🌙';
  }

  function bindEvents() {
    $('#fillExampleBtn').addEventListener('click', fillExample);
    $('#productForm').addEventListener('submit', event => {
      event.preventDefault();
      readProductForm();
      generateScenes();
    });

    $$('[data-style]').forEach(chip => chip.addEventListener('click', () => {
      state.style = chip.dataset.style;
      $$('[data-style]').forEach(item => item.classList.toggle('active', item === chip));
      saveState();
    }));
    $('#energyRange').addEventListener('input', event => {
      state.energy = Number(event.target.value);
      saveState();
    });
    $('#generateScriptBtn').addEventListener('click', () => {
      readProductForm();
      generateScenes();
    });
    $('#regenerateBtn').addEventListener('click', generateScenes);
    $('#simplifyBtn').addEventListener('click', simplifyScenes);
    $('#copyScriptBtn').addEventListener('click', () => copyText(buildFullScript(), 'Roteiro completo copiado.'));

    $('#prevLineBtn').addEventListener('click', () => { currentTrainingIndex--; renderTraining(); });
    $('#nextLineBtn').addEventListener('click', () => { currentTrainingIndex++; renderTraining(); });
    $('#recordPracticeBtn').addEventListener('click', togglePractice);
    $('#completeTrainingBtn').addEventListener('click', completeTraining);

    $('#startCameraBtn').addEventListener('click', startCamera);
    $('#stopCameraBtn').addEventListener('click', stopCamera);
    $$('#environmentChecklist input').forEach(input => input.addEventListener('change', () => {
      state.environmentChecks[input.dataset.check] = input.checked;
      updateEnvironmentStatus();
      saveState();
    }));

    $$('#capcutChecklist input').forEach(input => input.addEventListener('change', updateProgress));
    $('#copyEditPlanBtn').addEventListener('click', () => copyText(buildEditPlan(), 'Plano de edição copiado.'));
    $('#copyOnScreenTextBtn').addEventListener('click', () => copyText(buildOnScreenTexts().join('\n'), 'Textos de tela copiados.'));

    $$('#reviewChecklist input').forEach((input, index) => input.addEventListener('change', () => {
      state.reviewChecks[index] = input.checked;
      saveState();
      updateReview();
    }));
    $('#finishVideoBtn').addEventListener('click', () => {
      const completed = state.reviewChecks.filter(Boolean).length;
      if (completed < 8) {
        showToast(`Ainda faltam ${8 - completed} verificações.`);
        return;
      }
      state.stats.videos += 1;
      saveState();
      showToast('Vídeo marcado como preparado. Agora é publicar e aprender com o próximo.');
    });

    $('#exportDataBtn').addEventListener('click', exportData);
    $('#themeToggle').addEventListener('click', toggleTheme);
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./service-worker.js').catch(() => {});
    }
  }

  function init() {
    bindNavigation();
    hydrateForm();
    bindEvents();
    applyTheme();
    renderScript();
    renderTraining();
    renderRecordingBoard();
    renderCapCut();
    updateReview();
    updateDashboard();
    updateProgress();
    registerServiceWorker();
  }

  window.addEventListener('beforeunload', () => {
    stopCamera();
    stopAudioMeter();
  });
  document.addEventListener('DOMContentLoaded', init);
})();
