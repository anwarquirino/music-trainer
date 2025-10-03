// URL do modelo de áudio do Teachable Machine
const audioURL = "https://teachablemachine.withgoogle.com/models/X4RvKRucp/";
/* URL do modelo de imagem do Teachable Machine (Falta o Vitor mandar o link pra copiar a URL)
 * Link do modelo do Ícaro enviado como gambiarra como prova da integração bem-sucedida com a Webcam */
const imageURL = "https://teachablemachine.withgoogle.com/models/5HtSQCDyD/";

let recognizer, imageModel, webcam;
let audioClassLabels, imageClassLabels;
let isAnalyzing = false;
let imageLoopRequestID;

const startBtn = document.getElementById("start-btn");
const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const labelsWrapper = document.getElementById("labels-wrapper");
const audioLabelsWrapper = document.getElementById("audio-labels-wrapper");
const imageLabelsWrapper = document.getElementById("image-labels-wrapper");
const webcamContainer = document.getElementById("webcam-container");

function setStatus(color, text, pulse=false) {
  statusDot.className = "absolute inline-flex h-3 w-3 rounded-full " + color + (pulse ? " pulse" : "");
  statusText.textContent = text;
}

async function createAudioModel() {
  const checkpointURL = URL + "model.json";
  const metadataURL = URL + "metadata.json";
  const rec = speechCommands.create("BROWSER_FFT", undefined, checkpointURL, metadataURL);
  await rec.ensureModelLoaded();
  return rec;
}

function renderAudioLabelRows(labels) {
  labelsWrapper.innerHTML = "";
  labels.forEach((label, idx) => {
    const row = document.createElement("div");
    row.className = "grid grid-cols-1 sm:grid-cols-5 items-center gap-3 bg-white/5 rounded-xl p-3 ring-1 ring-white/10";
    row.innerHTML = `
      <div class="sm:col-span-2 flex items-center gap-2">
        <div class="h-2 w-2 rounded-full bg-white/40"></div>
        <div class="font-medium">${label}</div>
      </div>
      <div class="sm:col-span-3">
        <div class="bar-bg">
          <div class="bar" id="bar-${idx}" style="width: 0%"></div>
        </div>
        <div class="mt-1 text-xs text-slate-300">
          <span id="val-${idx}">0.00</span>
        </div>
      </div>
    `;
    audioLabelsWrapper.appendChild(row);
  });
}

function updateAudioBars(scores) {
  for (let i = 0; i < audioClassLabels.length; i++) {
    const p = Math.max(0, Math.min(1, scores[i] || 0));
    const w = (p * 100).toFixed(0) + "%";
    const bar = document.getElementById("audio-bar-" + i);
    const val = document.getElementById("audio-val-" + i);
    if (bar) bar.style.width = w;
    if (val) val.textContent = p.toFixed(2);
  }
}

// Funções novas para Webcam
async function createImageModelAndWebcam() {
    const modelURL = IMAGE_URL + "model.json";
    const metadataURL = IMAGE_URL + "metadata.json";
    imageModel = await tmImage.load(modelURL, metadataURL);
    imageClassLabels = imageModel.getClassLabels();

    const flip = true;
    webcam = new tmImage.Webcam(800, 800, flip);
    await webcam.setup();
    await webcam.play();

    await new Promise(resolve => setTimeout(resolve, 500));

    webcamContainer.appendChild(webcam.canvas);
}

function renderImageLabelRows(labels) {
    imageLabelsWrapper.innerHTML = "";
    labels.forEach((label, idx) => {
        const row = document.createElement("div");
        row.className = "grid grid-cols-1 sm:grid-cols-5 items-center gap-3 bg-white/5 rounded-xl p-3 ring-1 ring-white/10";
        row.innerHTML = `
          <div class="sm:col-span-2 flex items-center gap-2">
            <div class="h-2 w-2 rounded-full bg-white/40"></div>
            <div class="font-medium">${label}</div>
          </div>
          <div class="sm:col-span-3">
            <div class="bar-bg">
              <div class="bar" id="image-bar-${idx}" style="width: 0%"></div>
            </div>
            <div class="mt-1 text-xs text-slate-300">
              <span id="image-val-${idx}">0.00</span>
            </div>
          </div>
        `;
        imageLabelsWrapper.appendChild(row);
    });
}

function updateImageBars(prediction) {
    for (let i = 0; i < imageClassLabels.length; i++) {
        const classPrediction = prediction.find(p => p.className === imageClassLabels[i]);
        const p = classPrediction ? classPrediction.probability : 0;
        const w = (p * 100).toFixed(0) + "%";
        const bar = document.getElementById("image-bar-" + i);
        const val = document.getElementById("image-val-" + i);
        if (bar) bar.style.width = w;
        if (val) val.textContent = p.toFixed(2);
    }
}

async function imagePredictionLoop() {
  webcam.update();
  const prediction = await imageModel.predict(webcam.canvas);
  updateImageBars(prediction);
  if (isAnalyzing) {
    imageLoopRequestID = window.requestAnimationFrame(imagePresictionLoop);
  }
}

// Função de controle principal alterada
async function toggleAnalysis() {
  try {
    if (!recognizer || !imageModel) {
      setStatus("bg-yellow-400", "Carregando modelo...", true);
      startBtn.disabled = true;
      startBtn.classList.add("opacity-60", "cursor-not-allowed");

      recognizer = await createAudioModel();
      classLabels = recognizer.wordLabels();
      renderAudioLabelRows(audioClassLabels);


      startBtn.disabled = false;
      startBtn.classList.remove("opacity-60", "cursor-not-allowed");
      setStatus("bg-emerald-400", "Modelos carregados. Pronto para iniciar.");
      startBtn.textContent = "Iniciar Reconhecimento";
      return;
    }

    isAnalyzing = !isAnalyzing;

    if (isAnalyzing) {
      setStatus("bg-sky-400", "Escutando...", true);
      startBtn.textContent = "Parar";
      listening = true;
      
      const threshold = Number(document.getElementById("cfg-threshold").value);
      const overlap = Number(document.getElementById("cfg-overlap").value);
      const includeSpec = document.getElementById("cfg-spec").checked;

      recognizer.listen(result => {
        updateAudioBars(result.scores);
      }, {
        includeSpectrogram: includeSpec,
        probabilityThreshold: threshold,
        invokeCallbackOnNoiseAndUnknown: true,
        overlapFactor: overlap
      });
    } else {
      recognizer.stopListening();
      window.cancelFrameAnimation(imageLoopRequestID);
      setStatus("bg-emerald-400", "Parado. Pronto para reiniciar.");
      startBtn.textContent = "Continuar análise";
    }
  } catch (err) {
    console.error(err);
    setStatus("bg-red-500", "Erro ao iniciar. Verifique microfone e HTTPS.");
    startBtn.textContent = "Tentar novamente";
    startBtn.disabled = false;
    startBtn.classList.remove("opacity-60", "cursor-not-allowed");
    isAnalyzing = false;
  }
}

// Inicializa o botão
startBtn.addEventListener("click", toggleAnalysis);

