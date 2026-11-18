<a name="english"></a>

<div align="center">

<img src="screenshots/icon.png" width="120" alt="ZightScout Logo" />

# 💉 ZightScout

### CGM Glucose Monitor for Amazfit & Zepp OS smartwatches

**Your glucose data always on your wrist — fast, smart, and accessible.**

[![Version](https://img.shields.io/badge/version-3.0.61-blue?style=for-the-badge)](https://github.com/marcioamaro/ZightScout)
[![Zepp OS](https://img.shields.io/badge/Zepp_OS-3.0%2B-green?style=for-the-badge)](https://docs.zepp.com/)
[![License](https://img.shields.io/badge/license-Non--Commercial-orange?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-22%20Amazfit-purple?style=for-the-badge)](#supported-smartwatches-en)
[![Languages](https://img.shields.io/badge/languages-34-red?style=for-the-badge)](#supported-languages-en)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy_Me_A_Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/marcioamaro)
[![Contact](https://img.shields.io/badge/Contact-zightscout%40gmail.com-ea4335?style=for-the-badge&logo=gmail&logoColor=white)](mailto:zightscout@gmail.com)

---

🇺🇸 **English** | [🇧🇷 Português](#português) | [🇪🇸 Español](#español) | [🇫🇷 Français](#français) | [🇩🇪 Deutsch](#deutsch) | [🇨🇳 中文](#中文) | [🇯🇵 日本語](#日本語)

---

</div>

## ❤️ Welcome to ZightScout!

Living with diabetes and having to track glucose levels all day long is challenging. **ZightScout** was built to make this simpler: it connects your Amazfit smartwatch directly to your **Nightscout** server, displaying real-time glucose readings, vibrating alerts when levels leave your target range, and monitoring continuously in the background — even with the watch screen turned off.

No need to pull your phone out of your pocket. Just glance at your wrist. 💚

---

## 📸 Watch Screenshots

### Main Screen

| mg/dL | mmol/L |
|:---:|:---:|
| ![Main Screen mg/dL](screenshots/en/01_main_mgdl.png) | ![Main Screen mmol/L](screenshots/en/01_main_mmol.png) |
| Glucose in mg/dL with trend arrow | Glucose in mmol/L with delta |

### Settings

| Ranges & Targets | Alerts & Vibration | Server & Token |
|:---:|:---:|:---:|
| ![Settings - Ranges](screenshots/en/02_settings_ranges.png) | ![Settings - Alerts](screenshots/en/03_settings_alerts.png) | ![Settings - Server](screenshots/en/04_settings_server.png) |
| Set your glucose thresholds | Configure alerts and vibrations | Connect to your Nightscout |

---

## ✨ What makes ZightScout special?

### 🩸 Real-time glucose reading
Your current glucose value directly on your watch, in **mg/dL** or **mmol/L**, complete with 9-direction trend arrows (⇈ ↑ ↗ → ↘ ↓ ⇊ ⇕ -) and delta since the last reading. You will always know where your numbers are headed.

### 🔔 Smart vibration alerts
Feel wrist alerts whenever your glucose leaves your customized target boundaries:
- **⚠️ Warning Alert** — glucose below or above configured target limits
- **🚨 Critical Alert** — severe hypoglycemia or acute hyperglycemia, with intense vibration and automatic retry steps
- **😴 Alert Snooze** — temporarily mute alerts for 15, 30, or 60 minutes when needed

### 🌙 Background monitoring
ZightScout continues checking your glucose even when the watch screen is off. Select polling intervals of **5, 10, 30, or 60 minutes** and rest easy — your watch will wake you if needed.

### 📊 Visual 12-hour history chart
A built-in glucose graph of the last **12 hours** of readings right on your watch screen, fixed to a 40–250 mg/dL scale for effortless visual assessment.

### 🔒 Security by design
Your Nightscout authentication token is **never stored on the watch**. It remains protected on your phone inside the Zepp App. Server URLs are verified in real-time, and HTTPS is strictly required.

### 🌍 34 native languages
ZightScout speaks your language! Full native translation into **34 languages**, including Arabic, Hebrew (with bidirectional RTL layout), Thai, Hindi, and more.

### 📱 22 Amazfit smartwatch models
Fully compatible with 22 Amazfit smartwatch models running Zepp OS 3.0+ and all their regional variants (including Amazfit Active 2 Round, Square and NFC, GTS 4, GTR 4, Balance, T-Rex 3, Cheetah, and more).

---

## 📲 Official Release on Zepp App Store (Recommended)

The official, compiled, and ready-to-use version of **ZightScout** is available directly in the **Zepp App Store**!

<div align="center">

<img src="screenshots/zepp_app_logo.png" width="90" alt="Official Zepp App Logo" style="border-radius: 20%;" />

### Download the Official Zepp App:

[![Download on the App Store](https://img.shields.io/badge/App_Store-000000?style=for-the-badge&logo=apple&logoColor=white)](https://apps.apple.com/app/zepp/id1127269366)
[![Get it on Google Play](https://img.shields.io/badge/Google_Play-414141?style=for-the-badge&logo=google-play&logoColor=white)](https://play.google.com/store/apps/details?id=com.huami.watch.hmwatchmanager)

</div>

**How to install in 3 steps:**
1. Open the **Zepp App** on your phone (connected to your watch).
2. Go to **Profile → Your Device → App Store**.
3. Search for **ZightScout** and tap **Install**! 🎉

---

## 🚀 Quick Install (via QR Code)

The fastest way to install ZightScout on your smartwatch:

```bash
# 1. Install Zeus CLI (official Zepp OS developer tool)
npm install -g @zeppos/zeus-cli

# 2. Log in with your Zepp account
zeus login

# 3. Clone repository
git clone https://github.com/marcioamaro/ZightScout.git
cd ZightScout

# 4. Install dependencies
npm install

# 5. Generate installation QR Code
zeus preview
```

In the **Zepp** phone app:
1. Open Zepp app → **Profile → Settings → About**
2. Tap the Zepp icon **7 times** to unlock Developer Mode
3. Navigate to **Profile → Your Device → Developer Mode**
4. Tap **Scan** and scan the terminal QR code
5. ✅ Done! ZightScout will install onto your watch automatically

---

## 🔧 Manual Build & Installation (Step by Step)

### Prerequisites

| Tool | Minimum Version | Purpose |
|---|---|---|
| [Node.js](https://nodejs.org/) | 18+ | Run build scripts and tooling |
| [Zeus CLI](https://docs.zepp.com/docs/watchface/guides/zeus-cli/) | Latest | Compile and deploy to watch |
| Zepp Account | — | Authentication for Zeus CLI |
| Zepp App | Latest | Install on watch via QR or bridge |

### Step 1 — Clone the repository

```bash
git clone https://github.com/marcioamaro/ZightScout.git
cd ZightScout
```

### Step 2 — Install dependencies

```bash
npm install
```

### Step 3 — Log in to Zeus CLI

```bash
zeus login
```
> Use the same account as your phone's Zepp app.

### Step 4 — Compile the app

```bash
# Development build
zeus build

# Production build (optimized)
zeus build --production
```

The compiled package (`.zab`) is generated in `dist/`.

### Step 5 — Deploy to watch

**Option A: Via QR Code (easiest)**
```bash
zeus preview
```
Scan the QR code with the Zepp phone app.

**Option B: Via Bridge (recommended for developers)**
```bash
# Start bridge
zeus bridge

# In bridge prompt, run:
connect
install -t "Amazfit Active 2 (Round)"
```

> Replace `"Amazfit Active 2 (Round)"` with your target device name if different.

---

## ⚙️ Initial Watch Setup

After installation, ZightScout assists you with a setup wizard:

1. **Launch the app** on your watch — initial setup notice appears
2. Go to the **Server** tab and enter:
   - **Nightscout URL**: `https://your-site.nightscout.io` (must use HTTPS)
   - **Access Token**: your Nightscout token with read permissions
3. Tap **Test Connection** — displays `URL 200 OK | TOKEN OK` when verified
4. Set your **glucose target thresholds** in the **Ranges** tab
5. Configure your **vibration alerts** in the **Alerts** tab
6. Choose your **background polling interval** (5, 10, 30, or 60 min)
7. ✅ All set! ZightScout begins monitoring right away

---

## 📋 Comprehensive Feature List

### Main Screen
- ✅ Large easy-to-read glucose reading (mg/dL or mmol/L)
- ✅ 9-direction trend arrow (⇈ ↑ ↗ → ↘ ↓ ⇊ ⇕ -)
- ✅ Delta from previous reading (e.g., +3, -8)
- ✅ Time since last reading update (e.g., "2 min ago")
- ✅ Real-time Bluetooth and HTTP status indicators
- ✅ Manual instant refresh button
- ✅ Discrete app version indicator

### Background Monitoring
- ✅ Automated polling every 5, 10, 30, or 60 minutes
- ✅ Functions while screen is off and device is locked
- ✅ Native background permissions authorization via Zepp OS
- ✅ Automatic service resumption following watch reboots
- ✅ Diagnostics event logging for troubleshooting

### Alert Engine
- ✅ Warning alert (gentle vibration) for custom range boundaries
- ✅ Critical alert (intense vibration, up to 3 retries) for severe lows/highs
- ✅ System-native notification tones
- ✅ Event deduplication — avoids duplicate notifications for the same reading
- ✅ Snooze intervals for 15, 30, or 60 minutes
- ✅ Single-tap snooze dismissal from the main watch face
- ✅ Persistent alert queue to guarantee no missed urgent alerts

### Settings
- ✅ User-definable thresholds: veryLow, low, high, veryHigh
- ✅ Seamless mg/dL and mmol/L auto-conversion
- ✅ Real-time Nightscout URL and token health checks
- ✅ Token permission level badge (Read-only ✅ vs Admin ❗)
- ✅ Interactive animated toast notifications for all operations

---

<a name="supported-smartwatches-en"></a>
## 📱 Supported Smartwatch Models (22 models)

ZightScout is compatible with **22 Amazfit smartwatch models** running Zepp OS 3.0+ with high-resolution displays (covering 80 regional variants):

1. **Amazfit Active 2 (Round)**
2. **Amazfit Active 2 (Square)**
3. **Amazfit Active 2 (NFC)**
4. **Amazfit Active**
5. **Amazfit Active Max**
6. **Amazfit Active 3 Premium**
7. **Amazfit Balance**
8. **Amazfit Balance 2**
9. **Amazfit Balance 2 XT**
10. **Amazfit Balance Ultra**
11. **Amazfit Balance 3** (and Balance 3 Ti)
12. **Amazfit Cheetah (Round)**
13. **Amazfit Cheetah (Square)**
14. **Amazfit Cheetah Pro**
15. **Amazfit Cheetah 2 Pro** (and Cheetah 2 Ultra)
16. **Amazfit Falcon**
17. **Amazfit GTR 4** (and GTR 4 Limited Edition)
18. **Amazfit GTS 4**
19. **Amazfit T-Rex 3**
20. **Amazfit T-Rex 3 Pro** (44mm & 48mm)
21. **Amazfit T-Rex Ultra** (and T-Rex Ultra 2 / Dual Solar)
22. **Amazfit Bip 6** (and Bip Max)

> Supports devices running Zepp OS 3.0+ with high-resolution displays. Low-resolution displays (< 390×400 px) are excluded to preserve visual precision and medical data readability.

---

<a name="supported-languages-en"></a>
## 🌍 Supported Languages

ZightScout features native translations across **34 languages**:

🇧🇷 Portuguese (BR) · 🇵🇹 Portuguese (PT) · 🇺🇸 English · 🇪🇸 Spanish · 🇫🇷 French · 🇩🇪 German · 🇮🇹 Italian · 🇯🇵 Japanese · 🇨🇳 Chinese (Simplified) · 🇹🇼 Chinese (Traditional) · 🇰🇷 Korean · 🇷🇺 Russian · 🇸🇦 Arabic · 🇮🇳 Hindi · 🇹🇭 Thai · 🇻🇳 Vietnamese · 🇵🇱 Polish · 🇳🇱 Dutch · 🇸🇪 Swedish · 🇩🇰 Danish · 🇫🇮 Finnish · 🇳🇴 Norwegian · 🇨🇿 Czech · 🇸🇰 Slovak · 🇭🇺 Hungarian · 🇷🇴 Romanian · 🇭🇷 Serbian · 🇬🇷 Greek · 🇹🇷 Turkish · 🇺🇦 Ukrainian · 🇮🇩 Indonesian · 🇲🇾 Malay · 🇮🇱 Hebrew · 🇮🇱 Arabic (RTL)

---

## 🏗️ System Architecture

```
Nightscout Server (HTTPS)
         ▲
         │  fetch()
App-Side Service (inside phone's Zepp App)
         ▲
         │  BLE (Bluetooth Low Energy)
App Service (background on watch)
         │
         ▼
Main Watch App (Amazfit Active 2, Balance, etc.)
```

**Three interconnected components:**
- **Watch App**: displays glucose, sounds alerts, schedules background wakeups
- **Phone (App-Side)**: queries Nightscout over HTTPS, safely stores authentication token
- **Nightscout**: your personal cloud server providing continuous glucose telemetry

---

## 🔐 Privacy & Security

- 🔒 Your Nightscout token is saved **only on your smartphone**, never transferred to watch storage
- 🔒 Insecure non-HTTPS URLs are automatically rejected
- 🔒 Authentication tokens are never printed to debug logs or traces
- 🔒 Using a **read-only** (`readable`) token is strongly encouraged
- ⚠️ This application is a **CGM data monitor**. It is not a medical device and does not replace professional healthcare advice.

---

## 📄 License

This software is released under the **ZightScout Personal & Non-Commercial License**.  
It is provided completely free of charge for personal use, study, and self-compilation by individuals with diabetes.

**Restrictions:**
- ❌ **No Commercial Use:** Commercial sale, monetization, or charging any fees (directly or indirectly) is strictly prohibited.
- ❌ **No App Store Redistribution:** Publishing or submitting this application or any derivative works to the Zepp App Store, Amazfit App Store, Google Play, or any other app marketplace (whether free or paid) is strictly prohibited without prior written authorization from the author.

See the [LICENSE](LICENSE) file for complete legal terms.

---

<div align="center">

Made with ❤️ by diabetics, for diabetics.  
**ZightScout** — because every reading matters.

[⭐ Star on GitHub](https://github.com/marcioamaro/ZightScout) · [🐛 Report a Bug](https://github.com/marcioamaro/ZightScout/issues) · [💡 Suggest a Feature](https://github.com/marcioamaro/ZightScout/issues)

</div>

---

<a name="português"></a>

<div align="center">

<img src="screenshots/icon.png" width="120" alt="ZightScout Logo" />

# 💉 ZightScout

### Monitor de Glicemia CGM para smartwatches Amazfit & Zepp OS

**Seus dados de glicose sempre no pulso — rápidos, inteligentes e acessíveis.**

[![Versão](https://img.shields.io/badge/versão-3.0.61-blue?style=for-the-badge)](https://github.com/marcioamaro/ZightScout)
[![Zepp OS](https://img.shields.io/badge/Zepp_OS-3.0%2B-green?style=for-the-badge)](https://docs.zepp.com/)
[![Licença](https://img.shields.io/badge/licença-Não--Comercial-orange?style=for-the-badge)](LICENSE)
[![Modelos](https://img.shields.io/badge/modelos-22%20Amazfit-purple?style=for-the-badge)](#smartwatches-suportados-pt)
[![Idiomas](https://img.shields.io/badge/idiomas-34-red?style=for-the-badge)](#idiomas-suportados-pt)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy_Me_A_Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/marcioamaro)
[![Contato](https://img.shields.io/badge/Contato-zightscout%40gmail.com-ea4335?style=for-the-badge&logo=gmail&logoColor=white)](mailto:zightscout@gmail.com)

---

[🇺🇸 English](#english) | 🇧🇷 **Português** | [🇪🇸 Español](#español) | [🇫🇷 Français](#français) | [🇩🇪 Deutsch](#deutsch) | [🇨🇳 中文](#中文) | [🇯🇵 日本語](#日本語)

---

</div>

## ❤️ Bem-vindo ao ZightScout!

Viver com diabetes e precisar acompanhar a glicemia o dia inteiro é desafiador. O **ZightScout** nasceu exatamente para tornar isso mais simples: ele conecta seu relógio Amazfit diretamente ao seu servidor **Nightscout**, exibindo sua glicemia em tempo real, alertando quando ela sai dos limites e monitorando em segundo plano — mesmo com a tela apagada.

Você não precisa tirar o celular do bolso. Basta olhar para o pulso. 💚

---

## 📸 Telas no seu relógio

### Tela Principal

| mg/dL | mmol/L |
|:---:|:---:|
| ![Tela Principal mg/dL](screenshots/pt/01_main_mgdl.png) | ![Tela Principal mmol/L](screenshots/pt/01_main_mmol.png) |
| Glicemia em mg/dL com seta de tendência | Glicemia em mmol/L com delta |

### Configurações

| Intervalos e Metas | Alertas e Vibração | Servidor e Token |
|:---:|:---:|:---:|
| ![Configurações - Intervalos](screenshots/pt/02_settings_ranges.png) | ![Configurações - Alertas](screenshots/pt/03_settings_alerts.png) | ![Configurações - Servidor](screenshots/pt/04_settings_server.png) |
| Define seus limites de glicemia | Configura alertas e vibração | Conecta ao seu Nightscout |

---

## ✨ O que torna o ZightScout especial?

### 🩸 Leitura de glicose em tempo real
Seu valor de glicemia atualizado direto no relógio, em **mg/dL** ou **mmol/L**, com seta de tendência (⇈ ↑ ↗ → ↘ ↓ ⇊ ⇕ -) e delta desde a última leitura. Nunca mais você deixará de saber para onde sua glicemia está indo.

### 🔔 Alertas inteligentes com vibração
Receba alertas no pulso quando a glicemia sair dos seus limites personalizados:
- **⚠️ Alerta de aviso** — glicemia abaixo ou acima dos limites configurados
- **🚨 Alerta crítico** — hipoglicemia severa ou hiperglicemia grave, com vibração intensa e repetição automática
- **😴 Soneca de alerta** — pause os alertas por 15, 30 ou 60 minutos quando necessário

### 🌙 Monitoramento em segundo plano
O ZightScout continua funcionando mesmo com a tela apagada. Configure intervalos de coleta de **5, 10, 30 ou 60 minutos** e durma tranquilo — o relógio vai te acordar se precisar.

### 📊 Histórico visual de glicemia
Um gráfico das últimas **12 horas** de leituras diretamente na tela, com escala fixa de 40–250 mg/dL para fácil comparação visual.

### 🔒 Segurança desde o início
O token de autenticação do Nightscout **nunca é armazenado no relógio**. Ele fica protegido no seu telefone, dentro do aplicativo Zepp. A URL do servidor é validada em tempo real com HTTPS obrigatório.

### 🌍 34 idiomas nativos
O ZightScout fala a sua língua! Suporte nativo a **34 idiomas** incluindo Árabe, Hebraico (com layout RTL), Tailandês, Hindi, e muito mais.

### 📱 22 modelos de smartwatches Amazfit
Compatível com 22 modelos de smartwatches Amazfit com Zepp OS 3.0+ e todas as suas variantes regionais (incluindo Amazfit Active 2 Round, Square e NFC, GTS 4, GTR 4, Balance, T-Rex 3, Cheetah e outros).

---

## 📲 Versão Oficial na Zepp App Store (Recomendado)

A versão oficial, compilada e pronta para uso do **ZightScout** está disponível diretamente na **Zepp App Store** (Loja de Aplicativos do Zepp)!

<div align="center">

<img src="screenshots/zepp_app_logo.png" width="90" alt="Logotipo Oficial do Aplicativo Zepp" style="border-radius: 20%;" />

### Baixe o aplicativo oficial Zepp no celular:

[![Disponível na App Store](https://img.shields.io/badge/App_Store-000000?style=for-the-badge&logo=apple&logoColor=white)](https://apps.apple.com/app/zepp/id1127269366)
[![Disponível no Google Play](https://img.shields.io/badge/Google_Play-414141?style=for-the-badge&logo=google-play&logoColor=white)](https://play.google.com/store/apps/details?id=com.huami.watch.hmwatchmanager)

</div>

**Como instalar em 3 passos simples:**
1. Abra o app **Zepp** no seu celular (com o relógio conectado).
2. Vá em **Perfil → Seu Dispositivo → Loja de Aplicativos (App Store)**.
3. Busque por **ZightScout** e toque em **Instalar**! 🎉

---

## 🚀 Instalação rápida (via QR Code)

A forma mais rápida de instalar o ZightScout no seu relógio:

```bash
# 1. Instale o Zeus CLI (ferramenta oficial Zepp OS)
npm install -g @zeppos/zeus-cli

# 2. Faça login com sua conta Zepp
zeus login

# 3. Clone o repositório
git clone https://github.com/marcioamaro/ZightScout.git
cd ZightScout

# 4. Instale as dependências
npm install

# 5. Gere o QR Code de instalação
zeus preview
```

No aplicativo **Zepp** no celular:
1. Abra o app Zepp → **Perfil → Configurações → Sobre**
2. Toque no ícone Zepp **7 vezes** para ativar o Modo Desenvolvedor
3. Vá em **Perfil → Seu dispositivo → Modo Desenvolvedor**
4. Toque em **Escanear** e aponte a câmera para o QR Code no terminal
5. ✅ Pronto! O ZightScout será instalado automaticamente no seu relógio

---

## 🔧 Compilar e instalar manualmente (passo a passo)

### Pré-requisitos

| Ferramenta | Versão mínima | Para que serve |
|---|---|---|
| [Node.js](https://nodejs.org/) | 18+ | Executar scripts e ferramentas |
| [Zeus CLI](https://docs.zepp.com/docs/watchface/guides/zeus-cli/) | Mais recente | Compilar e instalar no relógio |
| Conta Zepp | — | Login para usar o Zeus CLI |
| Aplicativo Zepp | Mais recente | Instalar no relógio via QR ou bridge |

### Passo 1 — Clone o repositório

```bash
git clone https://github.com/marcioamaro/ZightScout.git
cd ZightScout
```

### Passo 2 — Instale as dependências

```bash
npm install
```

### Passo 3 — Faça login no Zeus CLI

```bash
zeus login
```
> Use a mesma conta do aplicativo Zepp no seu celular.

### Passo 4 — Compile o projeto

```bash
# Build de desenvolvimento
zeus build

# Build de produção (otimizado)
zeus build --production
```

O arquivo compilado (`.zab`) será gerado na pasta `dist/`.

### Passo 5 — Instale no relógio

**Opção A: Via QR Code (mais fácil)**
```bash
zeus preview
```
Escaneie o QR Code com o aplicativo Zepp.

**Opção B: Via bridge (recomendado para desenvolvedores)**
```bash
# Terminal — inicie o bridge
zeus bridge

# No prompt do bridge, envie:
connect
install -t "Amazfit Active 2 (Round)"
```

> Substitua `"Amazfit Active 2 (Round)"` pelo nome do seu dispositivo se for diferente.

---

## ⚙️ Configuração inicial no relógio

Após instalar, o ZightScout vai guiar você pela configuração:

1. **Abra o app** no relógio — aparecerá um aviso de configuração inicial
2. Vá para a aba **Servidor** e insira:
   - **URL do Nightscout**: `https://seu-site.nightscout.io` (obrigatório usar HTTPS)
   - **Token de acesso**: seu token Nightscout com permissão de leitura
3. Toque em **Testar Conexão** — você verá `URL 200 OK | TOKEN OK` se estiver tudo certo
4. Configure seus **limites de glicemia** na aba **Intervalos**
5. Ajuste os **alertas e vibração** na aba **Alertas**
6. Defina o **intervalo de monitoramento** em segundo plano (5, 10, 30 ou 60 min)
7. ✅ Tudo configurado! O ZightScout começa a monitorar imediatamente

---

## 📋 Funcionalidades completas

### Tela principal
- ✅ Glicemia atual em tamanho grande (mg/dL ou mmol/L)
- ✅ Seta de tendência com 9 direções (⇈ ↑ ↗ → ↘ ↓ ⇊ ⇕ -)
- ✅ Delta desde a última leitura (ex: +3, -8)
- ✅ Tempo desde a última atualização (ex: "2 min atrás")
- ✅ Indicador de status da conexão Bluetooth e HTTP
- ✅ Botão de atualização manual
- ✅ Versão do app exibida discretamente

### Monitoramento em segundo plano
- ✅ Coleta automática a cada 5, 10, 30 ou 60 minutos
- ✅ Funciona com a tela apagada e relógio bloqueado
- ✅ Autorização nativa da permissão de segundo plano pelo Zepp OS
- ✅ Reinício automático do serviço após reboot do relógio
- ✅ Log de diagnóstico para rastreamento de problemas

### Sistema de alertas
- ✅ Alerta de aviso (vibração leve) para limites configuráveis
- ✅ Alerta crítico (vibração intensa, repetição até 3x) para hipoglicemia grave
- ✅ Sons de notificação nativos do sistema
- ✅ Deduplicação — não repete o mesmo alerta duas vezes para a mesma leitura
- ✅ Soneca de 15, 30 ou 60 minutos
- ✅ Cancelamento de soneca com um toque na tela principal
- ✅ Fila persistente de alertas — nunca perde alertas críticos

### Configurações
- ✅ Limites configuráveis: veryLow, low, high, veryHigh
- ✅ Suporte a mg/dL e mmol/L com conversão automática
- ✅ Validação em tempo real da URL e do token Nightscout
- ✅ Indicador visual do nível de permissão do token (somente leitura ✅ ou admin ❗)
- ✅ Toasts animados de feedback nas ações (sincronizando, conectando, sucesso, erro)

---

<a name="smartwatches-suportados-pt"></a>
## 📱 Modelos de Smartwatches Compatíveis (22 modelos)

O ZightScout é compatível com **22 modelos de smartwatches Amazfit** com Zepp OS 3.0+ e tela de alta resolução (cobrindo 80 variantes regionais):

1. **Amazfit Active 2 (Round)**
2. **Amazfit Active 2 (Square)**
3. **Amazfit Active 2 (NFC)**
4. **Amazfit Active**
5. **Amazfit Active Max**
6. **Amazfit Active 3 Premium**
7. **Amazfit Balance**
8. **Amazfit Balance 2**
9. **Amazfit Balance 2 XT**
10. **Amazfit Balance Ultra**
11. **Amazfit Balance 3** (e Balance 3 Ti)
12. **Amazfit Cheetah (Round)**
13. **Amazfit Cheetah (Square)**
14. **Amazfit Cheetah Pro**
15. **Amazfit Cheetah 2 Pro** (e Cheetah 2 Ultra)
16. **Amazfit Falcon**
17. **Amazfit GTR 4** (e GTR 4 Limited Edition)
18. **Amazfit GTS 4**
19. **Amazfit T-Rex 3**
20. **Amazfit T-Rex 3 Pro** (44mm e 48mm)
21. **Amazfit T-Rex Ultra** (e T-Rex Ultra 2 / Dual Solar)
22. **Amazfit Bip 6** (e Bip Max)

> Suporta as versões com Zepp OS 3.0+ e tela de alta resolução. Modelos com resolução reduzida (< 390×400 px) não são suportados para preservar a clareza e legibilidade dos dados médicos.

---

<a name="idiomas-suportados-pt"></a>
## 🌍 Idiomas suportados

O ZightScout é totalmente traduzido em **34 idiomas**:

🇧🇷 Português (BR) · 🇵🇹 Português (PT) · 🇺🇸 English · 🇪🇸 Español · 🇫🇷 Français · 🇩🇪 Deutsch · 🇮🇹 Italiano · 🇯🇵 日本語 · 🇨🇳 中文(简) · 🇹🇼 中文(繁) · 🇰🇷 한국어 · 🇷🇺 Русский · 🇸🇦 العربية · 🇮🇳 हिन्दी · 🇹🇭 ภาษาไทย · 🇻🇳 Tiếng Việt · 🇵🇱 Polski · 🇳🇱 Nederlands · 🇸🇪 Svenska · 🇩🇰 Dansk · 🇫🇮 Suomi · 🇳🇴 Norsk · 🇨🇿 Čeština · 🇸🇰 Slovenčina · 🇭🇺 Magyar · 🇷🇴 Română · 🇭🇷 Srpski · 🇬🇷 Ελληνικά · 🇹🇷 Türkçe · 🇺🇦 Українська · 🇮🇩 Bahasa Indonesia · 🇲🇾 Bahasa Melayu · 🇮🇱 עברית · 🇮🇱 عربي (RTL)

---

## 🏗️ Arquitetura do sistema

```
Servidor Nightscout (HTTPS)
         ▲
         │  fetch()
App-Side Service (no Zepp App do celular)
         ▲
         │  BLE (Bluetooth Low Energy)
App Service (segundo plano no relógio)
         │
         ▼
Tela principal do relógio (Amazfit Active 2, etc.)
```

**Três partes integradas:**
- **Relógio**: exibe a glicemia, dispara alertas, agenda coletas por alarme
- **Celular (App-Side)**: acessa o Nightscout via HTTPS, guarda o token com segurança
- **Nightscout**: seu servidor pessoal com os dados do sensor CGM

---

## 🔐 Privacidade e segurança

- 🔒 O token Nightscout é armazenado **apenas no celular**, nunca no relógio
- 🔒 URLs sem HTTPS são rejeitadas automaticamente
- 🔒 Token nunca aparece em logs ou diagnósticos
- 🔒 Recomendamos usar um token com permissão **somente leitura** (`readable`)
- ⚠️ Este aplicativo é um **monitor de dados CGM**. Não substitui orientação médica.

---

## 📄 Licença

Este software é distribuído sob a **Licença de Uso Pessoal e Não-Comercial do ZightScout**.  
Ele é disponibilizado gratuitamente para uso pessoal, estudo e compilação própria por pessoas com diabetes.

**Restrições:**
- ❌ **Uso Comercial Proibido:** É estritamente proibida a venda, monetização ou cobrança de qualquer taxa direta ou indireta pelo software ou versões derivadas.
- ❌ **Proibida Publicação em Lojas de Aplicativos:** É expressamente proibido publicar ou submeter este aplicativo ou versões modificadas na Zepp App Store, Amazfit App Store, Google Play ou qualquer outra loja de aplicativos (sejam gratuitas ou pagas) sem autorização prévia por escrito do autor.

Consulte o arquivo [LICENSE](LICENSE) para o texto legal completo.

---

<div align="center">

Feito com ❤️ por diabéticos, para diabéticos.  
**ZightScout** — porque cada leitura importa.

[⭐ Dê uma estrela no GitHub](https://github.com/marcioamaro/ZightScout) · [🐛 Reportar um bug](https://github.com/marcioamaro/ZightScout/issues) · [💡 Sugerir uma ideia](https://github.com/marcioamaro/ZightScout/issues)

</div>

---

<a name="español"></a>

<div align="center">

<img src="screenshots/icon.png" width="120" alt="ZightScout Logo" />

# 💉 ZightScout

### Monitor de Glucemia CGM para smartwatches Amazfit & Zepp OS

**Tus datos de glucosa siempre en tu muñeca: rápidos, inteligentes y accesibles.**

[![Versión](https://img.shields.io/badge/versión-3.0.61-blue?style=for-the-badge)](https://github.com/marcioamaro/ZightScout)
[![Zepp OS](https://img.shields.io/badge/Zepp_OS-3.0%2B-green?style=for-the-badge)](https://docs.zepp.com/)
[![Licencia](https://img.shields.io/badge/licencia-No--Comercial-orange?style=for-the-badge)](LICENSE)
[![Modelos](https://img.shields.io/badge/modelos-22%20Amazfit-purple?style=for-the-badge)](#smartwatches-compatibles-es)
[![Idiomas](https://img.shields.io/badge/idiomas-34-red?style=for-the-badge)](#idiomas-compatibles-es)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy_Me_A_Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/marcioamaro)
[![Contacto](https://img.shields.io/badge/Contacto-zightscout%40gmail.com-ea4335?style=for-the-badge&logo=gmail&logoColor=white)](mailto:zightscout@gmail.com)

---

[🇺🇸 English](#english) | [🇧🇷 Português](#português) | 🇪🇸 **Español** | [🇫🇷 Français](#français) | [🇩🇪 Deutsch](#deutsch) | [🇨🇳 中文](#中文) | [🇯🇵 日本語](#日本語)

---

</div>

## ❤️ ¡Bienvenido a ZightScout!

Vivir con diabetes y tener que vigilar la glucemia todo el día es un desafío continuo. **ZightScout** nació para hacer la vida más fácil: conecta tu reloj Amazfit directamente con tu servidor **Nightscout**, mostrando tu glucemia en tiempo real, avisándote con vibraciones cuando los niveles se salen de tus rangos y monitoreando en segundo plano, incluso con la pantalla apagada.

No hace falta sacar el móvil del bolsillo. Solo echa un vistazo a tu muñeca. 💚

---

## 📸 Capturas de pantalla en tu reloj

### Pantalla Principal

| mg/dL | mmol/L |
|:---:|:---:|
| ![Pantalla Principal mg/dL](screenshots/es/01_main_mgdl.png) | ![Pantalla Principal mmol/L](screenshots/es/01_main_mmol.png) |
| Glucemia en mg/dL con flecha de tendencia | Glucemia en mmol/L con delta |

### Ajustes

| Rangos y Objetivos | Alertas y Vibración | Servidor y Token |
|:---:|:---:|:---:|
| ![Ajustes - Rangos](screenshots/es/02_settings_ranges.png) | ![Ajustes - Alertas](screenshots/es/03_settings_alerts.png) | ![Ajustes - Servidor](screenshots/es/04_settings_server.png) |
| Configura tus límites de glucemia | Configura alertas y vibraciones | Conecta con tu Nightscout |

---

## ✨ ¿Qué hace especial a ZightScout?

### 🩸 Lectura de glucosa en tiempo real
Tu valor de glucemia al instante en tu reloj, en **mg/dL** o **mmol/L**, con flechas de tendencia de 9 direcciones (⇈ ↑ ↗ → ↘ ↓ ⇊ ⇕ -) y delta respecto a la última medición.

### 🔔 Alertas inteligentes con vibración
Siente vibraciones en tu muñeca cuando la glucemia rebase tus límites personalizados:
- **⚠️ Alerta de advertencia** — glucemia fuera del rango normal
- **🚨 Alerta crítica** — hipoglucemia severa o hiperglucemia aguda, con vibración intensa y reintentos automáticos
- **😴 Posponer alerta** — silencia temporalmente los avisos durante 15, 30 o 60 minutos

### 🌙 Monitoreo en segundo plano
ZightScout sigue trabajando mientras el reloj reposa con la pantalla apagada. Configura intervalos de **5, 10, 30 o 60 minutos** y descansa tranquilo.

### 📊 Gráfica visual de 12 horas
Visualiza el historial de las últimas **12 horas** directamente en tu muñeca, con escala fija de 40–250 mg/dL para una interpretación inmediata.

### 🔒 Seguridad desde el diseño
El token de autenticación **nunca se almacena en el reloj**, permanece a salvo en tu teléfono dentro de la app Zepp. Conexión segura mediante HTTPS obligatorio.

### 🌍 34 idiomas nativos
¡ZightScout habla tu idioma! Traducido a **34 idiomas**, con soporte completo para hebreo y árabe (diseño RTL).

### 📱 22 modelos de smartwatches Amazfit
Compatible con 22 modelos de relojes Amazfit con Zepp OS 3.0+ y todas sus variantes regionales (incluyendo Amazfit Active 2 Round, Square y NFC, GTS 4, GTR 4, Balance, T-Rex 3, Cheetah y más).

---

## 📲 Versión Oficial en la Zepp App Store (Recomendado)

¡La versión oficial compilada y lista para usar de **ZightScout** está disponible directamente en la **Zepp App Store**!

<div align="center">

<img src="screenshots/zepp_app_logo.png" width="90" alt="Logotipo Oficial de Zepp App" style="border-radius: 20%;" />

### Descarga la aplicación oficial Zepp:

[![Disponible en App Store](https://img.shields.io/badge/App_Store-000000?style=for-the-badge&logo=apple&logoColor=white)](https://apps.apple.com/app/zepp/id1127269366)
[![Disponible en Google Play](https://img.shields.io/badge/Google_Play-414141?style=for-the-badge&logo=google-play&logoColor=white)](https://play.google.com/store/apps/details?id=com.huami.watch.hmwatchmanager)

</div>

**Cómo instalar en 3 pasos:**
1. Abre la app **Zepp** en tu teléfono (con el reloj conectado).
2. Ve a **Perfil → Tu dispositivo → Tienda de aplicaciones (App Store)**.
3. Busca **ZightScout** y pulsa **Instalar** 🎉

---

## 🚀 Instalación rápida (mediante código QR)

```bash
# 1. Instala Zeus CLI (herramienta oficial de Zepp OS)
npm install -g @zeppos/zeus-cli

# 2. Inicia sesión con tu cuenta Zepp
zeus login

# 3. Clona el repositorio
git clone https://github.com/marcioamaro/ZightScout.git
cd ZightScout

# 4. Instala las dependencias
npm install

# 5. Genera el código QR
zeus preview
```

En la app **Zepp** de tu teléfono:
1. Abre Zepp → **Perfil → Ajustes → Acerca de**
2. Pulsa el icono de Zepp **7 veces** para activar el Modo Desarrollador
3. Ve a **Perfil → Tu dispositivo → Modo Desarrollador**
4. Pulsa en **Escanear** y enfoca el código QR de la terminal
5. ✅ ¡Listo! ZightScout se instalará automáticamente en tu reloj

---

## 🔧 Compilación e instalación manual

### Paso 1 — Clona el repositorio
```bash
git clone https://github.com/marcioamaro/ZightScout.git
cd ZightScout
npm install
zeus login
```

### Paso 2 — Compila el proyecto
```bash
# Build de desarrollo
zeus build

# Build de producción (optimizado)
zeus build --production
```

### Paso 3 — Instala en el reloj
```bash
# Mediante bridge
zeus bridge
connect
install -t "Amazfit Active 2 (Round)"
```

---

<a name="smartwatches-compatibles-es"></a>
## 📱 Modelos de Smartwatches Compatibles (22 modelos)

ZightScout es compatible con **22 modelos de smartwatches Amazfit** con Zepp OS 3.0+ y pantallas de alta resolución (cubriendo 80 variantes regionales):

1. **Amazfit Active 2 (Round)**
2. **Amazfit Active 2 (Square)**
3. **Amazfit Active 2 (NFC)**
4. **Amazfit Active**
5. **Amazfit Active Max**
6. **Amazfit Active 3 Premium**
7. **Amazfit Balance**
8. **Amazfit Balance 2**
9. **Amazfit Balance 2 XT**
10. **Amazfit Balance Ultra**
11. **Amazfit Balance 3** (y Balance 3 Ti)
12. **Amazfit Cheetah (Round)**
13. **Amazfit Cheetah (Square)**
14. **Amazfit Cheetah Pro**
15. **Amazfit Cheetah 2 Pro** (y Cheetah 2 Ultra)
16. **Amazfit Falcon**
17. **Amazfit GTR 4** (y GTR 4 Limited Edition)
18. **Amazfit GTS 4**
19. **Amazfit T-Rex 3**
20. **Amazfit T-Rex 3 Pro** (44mm y 48mm)
21. **Amazfit T-Rex Ultra** (y T-Rex Ultra 2 / Dual Solar)
22. **Amazfit Bip 6** (y Bip Max)

> Compatible con versiones con Zepp OS 3.0+ y pantallas de alta resolución.

---

<a name="idiomas-compatibles-es"></a>
## 🌍 Idiomas compatibles

Traducido completamente a **34 idiomas**:  
🇧🇷 Português (BR) · 🇵🇹 Português (PT) · 🇺🇸 English · 🇪🇸 Español · 🇫🇷 Français · 🇩🇪 Deutsch · 🇮🇹 Italiano · 🇯🇵 日本語 · 🇨🇳 中文(简) · 🇹🇼 中文(繁) · 🇰🇷 한국어 · 🇷🇺 Русский · 🇸🇦 العربية · 🇮🇳 हिन्दी · 🇹🇭 ภาษาไทย · 🇻🇳 Tiếng Việt · 🇵🇱 Polski · 🇳🇱 Nederlands · 🇸🇪 Svenska · 🇩🇰 Dansk · 🇫🇮 Suomi · 🇳🇴 Norsk · 🇨🇿 Čeština · 🇸🇰 Slovenčina · 🇭🇺 Magyar · 🇷🇴 Română · 🇭🇷 Srpski · 🇬🇷 Ελληνικά · 🇹🇷 Türkçe · 🇺🇦 Українська · 🇮🇩 Bahasa Indonesia · 🇲🇾 Bahasa Melayu · 🇮🇱 עברית · 🇮🇱 عربي

---

## 🔐 Privacidad y seguridad

- 🔒 El token Nightscout se almacena **exclusivamente en tu teléfono**.
- 🔒 Exige HTTPS; conexiones no seguras son rechazadas.
- ⚠️ Esta aplicación es un **monitor de datos CGM**. No sustituye el asesoramiento médico profesional.

---

## 📄 Licencia

Este software se distribuye bajo la **Licencia de Uso Personal y No Comercial de ZightScout**.  
Se proporciona de forma gratuita para uso personal, estudio y compilación propia.

**Restricciones:**
- ❌ **Uso comercial prohibido:** Queda estrictamente prohibida la venta, monetización o cobro de cualquier tarifa.
- ❌ **Prohibida la publicación en tiendas de apps:** No se permite publicar o distribuir esta app en la Zepp App Store, Amazfit App Store u otras tiendas de aplicaciones sin autorización previa por escrito del autor.

Consulta el archivo [LICENSE](LICENSE) para más detalles.

---

<div align="center">

Hecho con ❤️ por personas con diabetes, para personas con diabetes.  
**ZightScout** — porque cada lectura cuenta.

</div>

---

<a name="français"></a>

<div align="center">

<img src="screenshots/icon.png" width="120" alt="ZightScout Logo" />

# 💉 ZightScout

### Moniteur de Glycémie CGM pour montres connectées Amazfit & Zepp OS

**Vos données de glycémie toujours au poignet — rapides, intelligentes et accessibles.**

[![Version](https://img.shields.io/badge/version-3.0.61-blue?style=for-the-badge)](https://github.com/marcioamaro/ZightScout)
[![Zepp OS](https://img.shields.io/badge/Zepp_OS-3.0%2B-green?style=for-the-badge)](https://docs.zepp.com/)
[![Licence](https://img.shields.io/badge/licence-Non--Commercial-orange?style=for-the-badge)](LICENSE)
[![Modèles](https://img.shields.io/badge/modèles-22%20Amazfit-purple?style=for-the-badge)](#montres-compatibles-fr)
[![Langues](https://img.shields.io/badge/langues-34-red?style=for-the-badge)](#langues-compatibles-fr)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy_Me_A_Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/marcioamaro)
[![Contact](https://img.shields.io/badge/Contact-zightscout%40gmail.com-ea4335?style=for-the-badge&logo=gmail&logoColor=white)](mailto:zightscout@gmail.com)

---

[🇺🇸 English](#english) | [🇧🇷 Português](#português) | [🇪🇸 Español](#español) | 🇫🇷 **Français** | [🇩🇪 Deutsch](#deutsch) | [🇨🇳 中文](#中文) | [🇯🇵 日本語](#日本語)

---

</div>

## ❤️ Bienvenue sur ZightScout !

Vivre avec le diabète et devoir surveiller sa glycémie toute la journée est un défi constant. **ZightScout** a été créé pour simplifier votre quotidien : il relie directement votre montre Amazfit à votre serveur **Nightscout**, affichant vos valeurs en temps réel, vous alertant par vibration lorsque vos seuils sont dépassés et surveillant vos données en arrière-plan, même écran éteint.

Plus besoin de sortir votre téléphone. Un simple coup d'œil à votre poignet suffit. 💚

---

## 📸 Aperçu sur votre montre

### Écran Principal

| mg/dL | mmol/L |
|:---:|:---:|
| ![Écran Principal mg/dL](screenshots/fr/01_main_mgdl.png) | ![Écran Principal mmol/L](screenshots/fr/01_main_mmol.png) |
| Glycémie en mg/dL avec flèche de tendance | Glycémie en mmol/L avec delta |

### Paramètres

| Plages & Cibles | Alertes & Vibrations | Serveur & Token |
|:---:|:---:|:---:|
| ![Paramètres - Plages](screenshots/fr/02_settings_ranges.png) | ![Paramètres - Alertes](screenshots/fr/03_settings_alerts.png) | ![Paramètres - Serveur](screenshots/fr/04_settings_server.png) |
| Définissez vos seuils de glycémie | Configurez alertes et vibrations | Connectez votre Nightscout |

---

## ✨ Pourquoi ZightScout est-il unique ?

### 🩸 Glycémie en temps réel
Vos mesures instantanées en **mg/dL** ou **mmol/L**, avec flèches de tendance à 9 directions (⇈ ↑ ↗ → ↘ ↓ ⇊ ⇕ -) et delta depuis la dernière lecture.

### 🔔 Alertes vibrantes intelligentes
- **⚠️ Alerte d'avertissement** — dépassement de vos seuils personnalisés
- **🚨 Alerte critique** — hypoglycémie sévère ou hyperglycémie aiguë avec vibration intense et répétitions automatiques
- **😴 Répétition d'alerte (Snooze)** — mise en pause pendant 15, 30 ou 60 minutes

### 🌙 Surveillance continue en arrière-plan
ZightScout fonctionne même écran éteint. Intervalles configurables de **5, 10, 30 ou 60 minutes**.

### 📊 Graphique d'historique de 12 heures
Courbe visuelle des 12 dernières heures directement sur la montre (échelle fixe 40–250 mg/dL).

### 🔒 Sécurité et confidentialité
Le token d'authentification **reste exclusivement sur votre smartphone**. Chiffrement HTTPS obligatoire.

### 📱 22 modèles de montres connectées Amazfit
Compatible avec 22 modèles de montres Amazfit sous Zepp OS 3.0+ et toutes leurs variantes régionales (incluant Amazfit Active 2 Round, Square et NFC, GTS 4, GTR 4, Balance, T-Rex 3, Cheetah, etc.).

---

## 📲 Version Officielle sur le Zepp App Store (Recommandé)

La version officielle, compilée et prête à l'emploi de **ZightScout** est disponible directement sur le **Zepp App Store** !

<div align="center">

<img src="screenshots/zepp_app_logo.png" width="90" alt="Logo Officiel de l'application Zepp" style="border-radius: 20%;" />

### Téléchargez l'application officielle Zepp :

[![Télécharger sur l'App Store](https://img.shields.io/badge/App_Store-000000?style=for-the-badge&logo=apple&logoColor=white)](https://apps.apple.com/app/zepp/id1127269366)
[![Disponible sur Google Play](https://img.shields.io/badge/Google_Play-414141?style=for-the-badge&logo=google-play&logoColor=white)](https://play.google.com/store/apps/details?id=com.huami.watch.hmwatchmanager)

</div>

**Comment installer en 3 étapes :**
1. Ouvrez l'application **Zepp** sur votre smartphone (montre connectée).
2. Allez dans **Profil → Votre Appareil → Magasin d'applications (App Store)**.
3. Recherchez **ZightScout** et appuyez sur **Installer** ! 🎉

---

## 🚀 Installation rapide (via QR Code)

```bash
npm install -g @zeppos/zeus-cli
zeus login
git clone https://github.com/marcioamaro/ZightScout.git
cd ZightScout
npm install
zeus preview
```

Depuis l'application **Zepp** : activez le Mode Développeur dans Profil → Paramètres → À propos (7 tapes sur l'icône), puis scannez le QR code.

---

<a name="montres-compatibles-fr"></a>
## 📱 Modèles de Montres Connectées Compatibles (22 modèles)

ZightScout est compatible avec **22 modèles de montres Amazfit** sous Zepp OS 3.0+ avec écran haute résolution (couvrant 80 variantes régionales) :

1. **Amazfit Active 2 (Round)**
2. **Amazfit Active 2 (Square)**
3. **Amazfit Active 2 (NFC)**
4. **Amazfit Active**
5. **Amazfit Active Max**
6. **Amazfit Active 3 Premium**
7. **Amazfit Balance**
8. **Amazfit Balance 2**
9. **Amazfit Balance 2 XT**
10. **Amazfit Balance Ultra**
11. **Amazfit Balance 3** (et Balance 3 Ti)
12. **Amazfit Cheetah (Round)**
13. **Amazfit Cheetah (Square)**
14. **Amazfit Cheetah Pro**
15. **Amazfit Cheetah 2 Pro** (et Cheetah 2 Ultra)
16. **Amazfit Falcon**
17. **Amazfit GTR 4** (et GTR 4 Limited Edition)
18. **Amazfit GTS 4**
19. **Amazfit T-Rex 3**
20. **Amazfit T-Rex 3 Pro** (44mm & 48mm)
21. **Amazfit T-Rex Ultra** (et T-Rex Ultra 2 / Dual Solar)
22. **Amazfit Bip 6** (et Bip Max)

---

<a name="langues-compatibles-fr"></a>
## 🌍 Langues prises en charge

Disponible en **34 langues natives** : français, anglais, portugais, espagnol, allemand, italien, japonais, chinois, arabe, hébreu, etc.

---

## 📄 Licence

Ce logiciel est distribué sous la **Licence d'utilisation personnelle et non commerciale ZightScout**.  
Il est fourni gratuitement pour un usage personnel, l'étude et la compilation individuelle.

**Restrictions :**
- ❌ **Usage commercial interdit :** La vente, la monétisation ou la facturation sous quelque forme que ce soit sont strictement interdites.
- ❌ **Redistribution sur les magasins d'applications interdite :** La publication sur le Zepp App Store, l'Amazfit App Store ou tout autre magasin d'applications est interdite sans accord écrit préalable de l'auteur.

Consultez le fichier [LICENSE](LICENSE) pour plus de détails.

---

<div align="center">

Créé avec ❤️ par des personnes diabétiques, pour des personnes diabétiques.  
**ZightScout** — parce que chaque mesure compte.

</div>

---

<a name="deutsch"></a>

<div align="center">

<img src="screenshots/icon.png" width="120" alt="ZightScout Logo" />

# 💉 ZightScout

### CGM-Glukosemonitor für Amazfit & Zepp OS Smartwatches

**Ihre Glukosedaten jederzeit am Handgelenk — schnell, intelligent und zugänglich.**

[![Version](https://img.shields.io/badge/Version-3.0.61-blue?style=for-the-badge)](https://github.com/marcioamaro/ZightScout)
[![Zepp OS](https://img.shields.io/badge/Zepp_OS-3.0%2B-green?style=for-the-badge)](https://docs.zepp.com/)
[![Lizenz](https://img.shields.io/badge/Lizenz-Nicht--Kommerziell-orange?style=for-the-badge)](LICENSE)
[![Modelle](https://img.shields.io/badge/Modelle-22%20Amazfit-purple?style=for-the-badge)](#unterstuetzte-smartwatches-de)
[![Sprachen](https://img.shields.io/badge/Sprachen-34-red?style=for-the-badge)](#unterstuetzte-sprachen-de)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy_Me_A_Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/marcioamaro)
[![Kontakt](https://img.shields.io/badge/Kontakt-zightscout%40gmail.com-ea4335?style=for-the-badge&logo=gmail&logoColor=white)](mailto:zightscout@gmail.com)

---

[🇺🇸 English](#english) | [🇧🇷 Português](#português) | [🇪🇸 Español](#español) | [🇫🇷 Français](#français) | 🇩🇪 **Deutsch** | [🇨🇳 中文](#中文) | [🇯🇵 日本語](#日本語)

---

</div>

## ❤️ Willkommen bei ZightScout!

Das Leben mit Diabetes und die ständige Kontrolle des Blutzuckerspiegels ist eine tägliche Herausforderung. **ZightScout** wurde entwickelt, um dies spürbar zu erleichtern: Es verbindet Ihre Amazfit-Smartwatch direkt mit Ihrem **Nightscout**-Server, zeigt Ihren Blutzucker in Echtzeit an, warnt zuverlässig per Vibration bei Grenzwertüberschreitungen und überwacht kontinuierlich im Hintergrund — selbst bei ausgeschaltetem Display.

Sie müssen Ihr Smartphone nicht mehr aus der Tasche holen. Ein kurzer Blick auf Ihr Handgelenk genügt. 💚

---

## 📸 Screenshots auf Ihrer Smartwatch

### Hauptbildschirm

| mg/dL | mmol/L |
|:---:|:---:|
| ![Hauptbildschirm mg/dL](screenshots/de/01_main_mgdl.png) | ![Hauptbildschirm mmol/L](screenshots/de/01_main_mmol.png) |
| Blutzucker in mg/dL mit Trendpfeil | Blutzucker in mmol/L mit Delta |

### Einstellungen

| Bereiche & Ziele | Alarme & Vibration | Server & Token |
|:---:|:---:|:---:|
| ![Einstellungen - Bereiche](screenshots/de/02_settings_ranges.png) | ![Einstellungen - Alarme](screenshots/de/03_settings_alerts.png) | ![Einstellungen - Server](screenshots/de/04_settings_server.png) |
| Glukosegrenzen festlegen | Alarme und Vibrationen konfigurieren | Mit Nightscout verbinden |

---

## ✨ Was macht ZightScout besonders?

### 🩸 Echtzeit-Glukoseanzeige
Aktuelle Werte in **mg/dL** oder **mmol/L**, mit präzisen 9-Wege-Trendpfeilen (⇈ ↑ ↗ → ↘ ↓ ⇊ ⇕ -) und Delta zur vorherigen Messung.

### 🔔 Intelligente Vibrationsalarme
- **⚠️ Warnalarm** — bei Verlassen des konfigurierten Zielbereichs
- **🚨 Kritischer Alarm** — bei schwerer Hypoglykämie oder starker Hyperglykämie mit intensiver Vibration und automatischer Wiederholung
- **😴 Schlummerfunktion (Snooze)** — Alarm für 15, 30 oder 60 Minuten stummschalten

### 🌙 Zuverlässige Hintergrundüberwachung
Funktioniert kontinuierlich auch bei gesperrter Uhr und ausgeschaltetem Bildschirm. Abrufintervalle: **5, 10, 30 oder 60 Minuten**.

### 📊 12-Stunden-Verlaufsdiagramm
Grafische Visualisierung der letzten 12 Stunden auf einer festen Skala von 40–250 mg/dL direkt auf dem Zifferblatt.

### 🔒 Sicherheit & Datenschutz
Ihr Nightscout-Token wird **ausschließlich auf dem Smartphone** gespeichert und gelangt niemals auf die Uhr. HTTPS ist zwingend erforderlich.

### 📱 22 Amazfit Smartwatch-Modelle
Kompatibel mit 22 Amazfit-Modellen mit Zepp OS 3.0+ und allen regionalen Varianten (einschließlich Amazfit Active 2 Round, Square und NFC, GTS 4, GTR 4, Balance, T-Rex 3, Cheetah und weiteren).

---

## 📲 Offizielle Version im Zepp App Store (Empfohlen)

Die offizielle, fertig kompilierte Version von **ZightScout** ist direkt im **Zepp App Store** verfügbar!

<div align="center">

<img src="screenshots/zepp_app_logo.png" width="90" alt="Offizielles Zepp App Logo" style="border-radius: 20%;" />

### Offizielle Zepp-App herunterladen:

[![Im App Store laden](https://img.shields.io/badge/App_Store-000000?style=for-the-badge&logo=apple&logoColor=white)](https://apps.apple.com/app/zepp/id1127269366)
[![Jetzt bei Google Play](https://img.shields.io/badge/Google_Play-414141?style=for-the-badge&logo=google-play&logoColor=white)](https://play.google.com/store/apps/details?id=com.huami.watch.hmwatchmanager)

</div>

**Installation in 3 einfachen Schritten:**
1. Öffnen Sie die **Zepp-App** auf Ihrem Smartphone (mit verbundener Uhr).
2. Gehen Sie zu **Profil → Ihr Gerät → App Store**.
3. Suchen Sie nach **ZightScout** und tippen Sie auf **Installieren**! 🎉

---

## 🚀 Schnellinstallation (über QR-Code)

```bash
npm install -g @zeppos/zeus-cli
zeus login
git clone https://github.com/marcioamaro/ZightScout.git
cd ZightScout
npm install
zeus preview
```

In der **Zepp-App**: Entwicklermodus aktivieren (Profil → Einstellungen → Über → 7x auf das Zepp-Logo tippen) und QR-Code scannen.

---

<a name="unterstuetzte-smartwatches-de"></a>
## 📱 Unterstützte Smartwatch-Modelle (22 Modelle)

ZightScout ist kompatibel mit **22 Amazfit Smartwatch-Modellen** mit Zepp OS 3.0+ und hochauflösendem Display (deckt 80 regionale Varianten ab):

1. **Amazfit Active 2 (Round)**
2. **Amazfit Active 2 (Square)**
3. **Amazfit Active 2 (NFC)**
4. **Amazfit Active**
5. **Amazfit Active Max**
6. **Amazfit Active 3 Premium**
7. **Amazfit Balance**
8. **Amazfit Balance 2**
9. **Amazfit Balance 2 XT**
10. **Amazfit Balance Ultra**
11. **Amazfit Balance 3** (und Balance 3 Ti)
12. **Amazfit Cheetah (Round)**
13. **Amazfit Cheetah (Square)**
14. **Amazfit Cheetah Pro**
15. **Amazfit Cheetah 2 Pro** (und Cheetah 2 Ultra)
16. **Amazfit Falcon**
17. **Amazfit GTR 4** (und GTR 4 Limited Edition)
18. **Amazfit GTS 4**
19. **Amazfit T-Rex 3**
20. **Amazfit T-Rex 3 Pro** (44mm & 48mm)
21. **Amazfit T-Rex Ultra** (und T-Rex Ultra 2 / Dual Solar)
22. **Amazfit Bip 6** (und Bip Max)

---

<a name="unterstuetzte-sprachen-de"></a>
## 🌍 Unterstützte Sprachen

Vollständig übersetzt in **34 Sprachen**: Deutsch, Englisch, Portugiesisch, Spanisch, Französisch, Italienisch, Japanisch, Chinesisch, Arabisch, Hebräisch u.v.m.

---

## 📄 Lizenz

Diese Software wird unter der **ZightScout-Lizenz für persönliche und nicht-kommerzielle Nutzung** bereitgestellt.  
Sie ist kostenlos für den persönlichen Gebrauch, das Studium und die eigene Kompilierung gedacht.

**Einschränkungen:**
- ❌ **Keine kommerzielle Nutzung:** Verkauf, Monetarisierung oder Gebühren jeglicher Art sind strengstens untersagt.
- ❌ **Keine Veröffentlichung in App Stores:** Das Hochladen oder Veröffentlichen im Zepp App Store, Amazfit App Store oder anderen Plattformen ist ohne vorherige schriftliche Genehmigung des Autors untersagt.

Siehe die Datei [LICENSE](LICENSE) für vollständige Bedingungen.

---

<div align="center">

Mit ❤️ von Diabetikern für Diabetiker entwickelt.  
**ZightScout** — weil jeder Messwert zählt.

</div>

---

<a name="中文"></a>

<div align="center">

<img src="screenshots/icon.png" width="120" alt="ZightScout Logo" />

# 💉 ZightScout

### 适用于 Amazfit & Zepp OS 智能手表的 CGM 动态血糖监视器

**您的血糖数据时刻在手腕呈现——快速、智能、随手可及。**

[![版本](https://img.shields.io/badge/版本-3.0.61-blue?style=for-the-badge)](https://github.com/marcioamaro/ZightScout)
[![Zepp OS](https://img.shields.io/badge/Zepp_OS-3.0%2B-green?style=for-the-badge)](https://docs.zepp.com/)
[![许可证](https://img.shields.io/badge/许可证-仅供个人与非商业使用-orange?style=for-the-badge)](LICENSE)
[![适配机型](https://img.shields.io/badge/机型-22款Amazfit-purple?style=for-the-badge)](#支持的智能手表-zh)
[![支持语言](https://img.shields.io/badge/语言-34种-red?style=for-the-badge)](#支持的语言-zh)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy_Me_A_Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/marcioamaro)
[![联系邮箱](https://img.shields.io/badge/联系邮箱-zightscout%40gmail.com-ea4335?style=for-the-badge&logo=gmail&logoColor=white)](mailto:zightscout@gmail.com)

---

[🇺🇸 English](#english) | [🇧🇷 Português](#português) | [🇪🇸 Español](#español) | [🇫🇷 Français](#français) | [🇩🇪 Deutsch](#deutsch) | 🇨🇳 **中文** | [🇯🇵 日本語](#日本語)

---

</div>

## ❤️ 欢迎使用 ZightScout！

与糖尿病共处并全天候关注血糖水平是一项艰巨的挑战。**ZightScout** 的诞生就是为了让这一切变得更轻松：它将您的 Amazfit 智能手表直接连接到您的 **Nightscout** 服务器，实时显示血糖数据，超出自定义范围时通过震动即时提醒，并在后台全天候持续监测——即使屏幕息屏也能稳定运行。

您无需频繁掏出手机，只需轻轻抬起手腕，健康数据一目了然。💚

---

## 📸 手表运行实拍图

### 主屏幕

| mg/dL 单位 | mmol/L 单位 |
|:---:|:---:|
| ![主屏幕 mg/dL](screenshots/zh/01_main_mgdl.png) | ![主屏幕 mmol/L](screenshots/zh/01_main_mmol.png) |
| mg/dL 血糖值与 9 向趋势箭头 | mmol/L 血糖值与变化差值 |

### 设置页面

| 阈值范围设置 | 警报与震动配置 | 服务器与 Token 验证 |
|:---:|:---:|:---:|
| ![设置 - 范围](screenshots/zh/02_settings_ranges.png) | ![设置 - 警报](screenshots/zh/03_settings_alerts.png) | ![设置 - 服务器](screenshots/zh/04_settings_server.png) |
| 自定义高低血糖界限 | 设置提醒与强力震动模式 | 实时测试 Nightscout 连接 |

---

## ✨ 为什么选择 ZightScout？

### 🩸 实时血糖监测
手表端直观呈现当前血糖值（支持 **mg/dL** 与 **mmol/L**），附带 9 方向趋势指示箭头（⇈ ↑ ↗ → ↘ ↓ ⇊ ⇕ -）及相比上一读数的变化差值。

### 🔔 智能震动警报
- **⚠️ 预警提醒** — 血糖超出正常目标区间时轻柔提醒
- **🚨 危险报警** — 出现严重低血糖或严重高血糖时强力震动，并具备自动重试提醒机制
- **😴 贪睡模式 (Snooze)** — 支持 15、30 或 60 分钟暂缓提醒

### 🌙 全天候后台持续守护
即使手表处于熄屏或锁定状态，系统也会按照设定的 **5、10、30 或 60 分钟** 周期自动同步最新数据。

### 📊 12 小时历史趋势折线图
主屏幕内置直观的近 12 小时血糖历史曲线，固定 40–250 mg/dL 刻度，轻松判断全天控制趋势。

### 🔒 严谨的隐私与数据安全
Nightscout 访问令牌 **仅保存在手机端 Zepp App 中**，绝不传输或储存在手表硬件存储中。全程强制采用 HTTPS 加密连接。

### 📱 22 款 Amazfit 智能手表机型
全面支持搭载 Zepp OS 3.0+ 的 22 款 Amazfit 智能手表及其全部区域衍生版本（包括 Amazfit Active 2 Round、Square、NFC 版、GTS 4、GTR 4、Balance、T-Rex 3、Cheetah 等）。

---

## 📲 Zepp App Store 官方正式版（推荐安装方式）

**ZightScout** 官方已编译的正式版本已上架 **Zepp 官方应用商店 (Zepp App Store)**，即装即用！

<div align="center">

<img src="screenshots/zepp_app_logo.png" width="90" alt="Zepp App 官方图标" style="border-radius: 20%;" />

### 下载 Zepp 手机配套应用：

[![在 App Store 下载](https://img.shields.io/badge/App_Store-000000?style=for-the-badge&logo=apple&logoColor=white)](https://apps.apple.com/app/zepp/id1127269366)
[![在 Google Play 下载](https://img.shields.io/badge/Google_Play-414141?style=for-the-badge&logo=google-play&logoColor=white)](https://play.google.com/store/apps/details?id=com.huami.watch.hmwatchmanager)

</div>

**轻松安装三步走：**
1. 在手机上打开 **Zepp App**（确保手表已连接）。
2. 前往 **我的 → 您的手表设备 → 应用商店 (App Store)**。
3. 搜索 **ZightScout**，点击 **安装** 即可！🎉

---

## 🚀 极速安装（通过二维码）

```bash
# 1. 全局安装官方开发工具 Zeus CLI
npm install -g @zeppos/zeus-cli

# 2. 登录您的 Zepp 账号
zeus login

# 3. 克隆代码仓库并安装依赖
git clone https://github.com/marcioamaro/ZightScout.git
cd ZightScout
npm install

# 4. 生成安装预览二维码
zeus preview
```

在手机 **Zepp App** 中：前往「我的 → 设置 → 关于」，连续点击 Zepp 图标 **7 次** 开启开发者模式，进入「我的 → 您的手表设备 → 开发者模式」，点击扫码安装即可。

---

<a name="支持的智能手表-zh"></a>
## 📱 适配的智能手表型号（22款机型）

ZightScout 支持搭载 Zepp OS 3.0+ 高清屏幕的 **22 款 Amazfit 智能手表机型**（覆盖 80 款区域衍生版本）：

1. **Amazfit Active 2 (Round 圆形版)**
2. **Amazfit Active 2 (Square 方形版)**
3. **Amazfit Active 2 (NFC 版)**
4. **Amazfit Active**
5. **Amazfit Active Max**
6. **Amazfit Active 3 Premium**
7. **Amazfit Balance**
8. **Amazfit Balance 2**
9. **Amazfit Balance 2 XT**
10. **Amazfit Balance Ultra**
11. **Amazfit Balance 3**（及 Balance 3 Ti）
12. **Amazfit Cheetah (Round)**
13. **Amazfit Cheetah (Square)**
14. **Amazfit Cheetah Pro**
15. **Amazfit Cheetah 2 Pro**（及 Cheetah 2 Ultra）
16. **Amazfit Falcon**
17. **Amazfit GTR 4**（及 GTR 4 限量版）
18. **Amazfit GTS 4**
19. **Amazfit T-Rex 3**
20. **Amazfit T-Rex 3 Pro**（44mm 与 48mm）
21. **Amazfit T-Rex Ultra**（及 T-Rex Ultra 2 / 双太阳能版）
22. **Amazfit Bip 6**（及 Bip Max）

---

<a name="支持的语言-zh"></a>
## 🌍 完整支持 34 种语言

原生支持简体中文、繁体中文、英语、葡萄牙语、西班牙语、法语、德语、日语、韩语、俄语、阿拉伯语、希伯来语等 **34 种全球语言**。

---

## 📄 软件使用许可

本软件基于 **ZightScout 个人与非商业使用许可** 提供。  
专供糖尿病患者免费用于个人使用、学习及自主编译。

**核心限制：**
- ❌ **禁止商业化：** 严禁任何形式的商业销售、变现或收费。
- ❌ **禁止私自上架应用商店：** 未经原作者书面授权，严禁将本应用或衍生版本提交、发布到 Zepp App Store、Amazfit 商店或任何其他应用市场（无论收费或免费）。

完整法律条款请参阅 [LICENSE](LICENSE) 文件。

---

<div align="center">

由糖尿病患者用心打造，专为糖尿病患者服务。  
**ZightScout** —— 守护每一次心跳与读数。

</div>

---

<a name="日本語"></a>

<div align="center">

<img src="screenshots/icon.png" width="120" alt="ZightScout Logo" />

# 💉 ZightScout

### Amazfit & Zepp OS スマートウォッチ向け CGM 血糖値モニター

**いつでも手首に血糖データを — 高速、高機能、そして親しみやすく。**

[![バージョン](https://img.shields.io/badge/バージョン-3.0.61-blue?style=for-the-badge)](https://github.com/marcioamaro/ZightScout)
[![Zepp OS](https://img.shields.io/badge/Zepp_OS-3.0%2B-green?style=for-the-badge)](https://docs.zepp.com/)
[![ライセンス](https://img.shields.io/badge/ライセンス-個人利用・非商用-orange?style=for-the-badge)](LICENSE)
[![対応モデル](https://img.shields.io/badge/対応モデル-22モデルAmazfit-purple?style=for-the-badge)](#対応スマートウォッチ-ja)
[![言語](https://img.shields.io/badge/対応言語-34言語-red?style=for-the-badge)](#対応言語-ja)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy_Me_A_Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/marcioamaro)
[![連絡先](https://img.shields.io/badge/連絡先-zightscout%40gmail.com-ea4335?style=for-the-badge&logo=gmail&logoColor=white)](mailto:zightscout@gmail.com)

---

[🇺🇸 English](#english) | [🇧🇷 Português](#português) | [🇪🇸 Español](#español) | [🇫🇷 Français](#français) | [🇩🇪 Deutsch](#deutsch) | [🇨🇳 中文](#中文) | 🇯🇵 **日本語**

---

</div>

## ❤️ ZightScout へようこそ！

糖尿病とともに暮らし、一日中血糖値を気にかけ続けることは決して容易ではありません。**ZightScout** はその負担を和らげるために生まれました。お使いの Amazfit スマートウォッチを **Nightscout** サーバーに直接リンクさせ、リアルタイムで血糖値を表示。設定範囲を外れた際には心地よい振動で通知し、画面が消灯している間もバックグラウンドで静かに見守り続けます。

スマートフォンをポケットから取り出す必要はありません。手首を見るだけで、いつでも安心を確認できます。💚

---

## 📸 ウォッチ画面のプレビュー

### メイン画面

| mg/dL 表示 | mmol/L 表示 |
|:---:|:---:|
| ![メイン画面 mg/dL](screenshots/ja/01_main_mgdl.png) | ![メイン画面 mmol/L](screenshots/ja/01_main_mmol.png) |
| mg/dL 血糖値と 9 方向トレンド矢印 | mmol/L 血糖値と前回差分 (Delta) |

### 設定画面

| 血糖目標範囲 | アラートと振動設定 | サーバーと認証トークン |
|:---:|:---:|:---:|
| ![設定 - 範囲](screenshots/ja/02_settings_ranges.png) | ![設定 - アラート](screenshots/ja/03_settings_alerts.png) | ![設定 - サーバー](screenshots/ja/04_settings_server.png) |
| 高低血糖の閾値を設定 | アラート条件と振動パターン | Nightscout 接続の即時検証 |

---

## ✨ ZightScout が選ばれる理由

### 🩸 リアルタイムの血糖値表示
手首を傾けるだけで、現在の血糖値（**mg/dL** または **mmol/L**）、9 方向のトレンド矢印（⇈ ↑ ↗ → ↘ ↓ ⇊ ⇕ -）、前回の読み取りからの増減幅（Delta）がすぐに確認できます。

### 🔔 スマート振動アラート
- **⚠️ 警告アラート** — 設定した目標範囲を超過した際に通知
- **🚨 緊急アラート** — 重度の低血糖や高血糖を強力な振動と自動再試行で確実に伝達
- **😴 スヌーズ機能** — 必要に応じて 15分、30分、60分間アラートを一時停止

### 🌙 バックグラウンド常時モニタリング
画面消灯時やウォッチロック中も、**5分、10分、30分、60分** 間隔で自動的に最新データを取得します。

### 📊 12時間履歴グラフ
メイン画面に直近12時間の血糖トレンドを表示（40〜250 mg/dL 固定スケール）。

### 🔒 万全のプライバシーとセキュリティ
Nightscout のアクセス認証トークンは**スマートフォンの Zepp アプリ内にのみ安全に保持**され、ウォッチ本体には保存されません。HTTPS 通信が必須です。

### 📱 22の Amazfit スマートウォッチモデルに対応
Zepp OS 3.0+ を搭載した 22 の Amazfit スマートウォッチモデルおよび全地域派生版に対応（Amazfit Active 2 Round、Square、NFC、GTS 4、GTR 4、Balance、T-Rex 3、Cheetah など）。

---

## 📲 Zepp App Store 公式リリース版（おすすめのインストール方法）

**ZightScout** の公式コンパイル済みバージョンは、**Zepp 公式アプリストア (Zepp App Store)** から直接インストールいただけます！

<div align="center">

<img src="screenshots/zepp_app_logo.png" width="90" alt="Zepp App 公式ロゴ" style="border-radius: 20%;" />

### Zepp 公式スマートフォンのダウンロード：

[![App Store でダウンロード](https://img.shields.io/badge/App_Store-000000?style=for-the-badge&logo=apple&logoColor=white)](https://apps.apple.com/app/zepp/id1127269366)
[![Google Play で手に入れよう](https://img.shields.io/badge/Google_Play-414141?style=for-the-badge&logo=google-play&logoColor=white)](https://play.google.com/store/apps/details?id=com.huami.watch.hmwatchmanager)

</div>

**3ステップで簡単インストール：**
1. スマートフォンで **Zepp アプリ** を開きます（ウォッチと接続済み）。
2. **プロフィール → お使いのデバイス → アプリストア** に進みます。
3. **ZightScout** を検索し、**インストール** をタップするだけです！🎉

---

## 🚀 クイックインストール（QRコード）

```bash
npm install -g @zeppos/zeus-cli
zeus login
git clone https://github.com/marcioamaro/ZightScout.git
cd ZightScout
npm install
zeus preview
```

スマートフォン側の **Zepp アプリ** にて「プロフィール → 設定 → アプリについて」を開き、Zepp ロゴを **7回タップ** して開発者モードを有効化した後、QRコードをスキャンしてインストールします。

---

<a name="対応スマートウォッチ-ja"></a>
## 📱 対応スマートウォッチモデル（22モデル）

ZightScout は、Zepp OS 3.0+ を搭載した高解像度ディスプレイの **22の Amazfit スマートウォッチモデル** に対応しています（80の地域別バリエーションをカバー）：

1. **Amazfit Active 2 (Round ラウンド版)**
2. **Amazfit Active 2 (Square スクエア版)**
3. **Amazfit Active 2 (NFC 版)**
4. **Amazfit Active**
5. **Amazfit Active Max**
6. **Amazfit Active 3 Premium**
7. **Amazfit Balance**
8. **Amazfit Balance 2**
9. **Amazfit Balance 2 XT**
10. **Amazfit Balance Ultra**
11. **Amazfit Balance 3**（および Balance 3 Ti）
12. **Amazfit Cheetah (Round)**
13. **Amazfit Cheetah (Square)**
14. **Amazfit Cheetah Pro**
15. **Amazfit Cheetah 2 Pro**（および Cheetah 2 Ultra）
16. **Amazfit Falcon**
17. **Amazfit GTR 4**（および GTR 4 Limited Edition）
18. **Amazfit GTS 4**
19. **Amazfit T-Rex 3**
20. **Amazfit T-Rex 3 Pro**（44mm & 48mm）
21. **Amazfit T-Rex Ultra**（および T-Rex Ultra 2 / Dual Solar）
22. **Amazfit Bip 6**（および Bip Max）

---

<a name="対応言語-ja"></a>
## 🌍 34 の言語に対応

日本語、英語、ポルトガル語、スペイン語、フランス語、ドイツ語、中国語、韓国語、アラビア語、ヘブライ語を含む **34 の言語** を完全ネイティブサポートしています。

---

## 📄 ライセンス

本ソフトウェアは **ZightScout 個人利用・非商用ライセンス** のもとで提供されています。  
糖尿病を持つ方々による個人利用、研究、自己ビルドを目的として完全無償で提供されます。

**禁止事項：**
- ❌ **商用利用の禁止:** 本ソフトウェアや派生物を有料で販売・収益化することは固く禁じられています。
- ❌ **アプリストアへの無断公開の禁止:** 原作者の事前の書面による許可なく、Zepp App Store、Amazfit App Store、またはその他のアプリマーケットへ本アプリ（有償・無償を問わず）を公開・配信することは禁止されています。

詳細は [LICENSE](LICENSE) ファイルをご確認ください。

---

<div align="center">

糖尿病を持つ仲間によって、糖尿病を持つすべての人のために。  
**ZightScout** — 一つひとつの測定値が、あなたの毎日に寄り添います。

</div>

