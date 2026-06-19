# Music Trainer

Aplicação de treino musical baseada em **Machine Learning no navegador**, desenvolvida como projeto avaliativo da disciplina **IA2**. Usa modelos treinados no [Teachable Machine](https://teachablemachine.withgoogle.com/) para reconhecer áudio e imagem diretamente no front-end.

## O que faz

- Interface web que carrega modelos de ML treinados (áudio e imagem)
- Classificação em tempo real no navegador, sem backend
- Modelos exportados do Teachable Machine (TensorFlow.js)

## Estrutura

```
music-trainer/
├── interface-web/      # Front-end (HTML, CSS, JS)
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── modelo-audio/       # Artefatos do modelo de áudio (TensorFlow.js)
└── modelo_imagem/      # Artefatos do modelo de imagem
```

## Como executar

Por ser um front-end estático que carrega modelos via `fetch`, basta servir a pasta por HTTP (abrir o `index.html` direto no `file://` costuma bloquear o carregamento dos modelos por CORS).

```bash
git clone https://github.com/anwarquirino/music-trainer.git
cd music-trainer/interface-web

# Suba um servidor estático simples (escolha um):
python -m http.server 8000
# ou
npx serve .
```

Depois acesse `http://localhost:8000` no navegador.

## Tecnologias

- HTML5 / CSS3 / JavaScript
- TensorFlow.js
- Teachable Machine (treino dos modelos)

## Contexto

Projeto acadêmico da matéria de Inteligência Artificial (IA2).
