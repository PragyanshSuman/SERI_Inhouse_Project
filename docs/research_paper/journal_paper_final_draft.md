# An Automated Evidence-Based Learning Framework Using Convolutional Neural Networks to Improve Reading and Writing Skills in Children with Dyslexia

**[Author Name], [Co-Author Name]**
*[Institution Name], [Department], [City, Country]*
*Corresponding Author: [email@institution.edu]*

---

## Abstract

Dyslexia is a neurodevelopmental disorder affecting 10–15% of children globally, characterised by phonological and graphomotor deficits despite normal intelligence. Existing digital interventions apply affect-blind, static curricula and transmit sensitive biometric data of minors to cloud servers, violating COPPA and GDPR strictures. This paper presents the **Unified Learning App**, a Zero-Cloud, Edge AI educational platform designed for neurodivergent learners aged 4–10 in which all biometric inference executes entirely on a local FastAPI server — no child data ever leaves the device network.

The system integrates twelve tightly coupled subsystems: (1) a dual-channel affective engine combining FER+MTCNN facial detection at five-second intervals with Wav2Vec2-XLSR-SER acoustic emotion analysis as a three-second audio fallback, mediated by a priority-based AudioSessionManager arbitration protocol, producing a real-time Concentration Index *C*ᵢ; (2) a composite-scoring PathEngine delivering 3–5 personalised daily learning nodes using 60% skill-weakness, 25% spaced-repetition, and 15% novelty weighting; (3) a cubic Bezier graphomotor tracing engine with proximity-physics stylus cursor interaction, five reward actor themes, and a seven-category clinical kinematic biomarker report; (4) a novel Multi-Task Micro-CNN (Multi-Task Micro-CNN, ~380k parameters) jointly trained on EMNIST ByClass and the Kaggle Synthetic Dyslexia dataset to simultaneously predict character identity (62 classes), spatial orientation, and dyslexia risk — achieving 84.2% identification accuracy and 96.7% reversal sensitivity at 1.5 MB; (5) a Micro-CRNN with bidirectional LSTM and CTC decoding for word-level transcription and transposition detection; (6) a formulated Dyslexia Risk Index *P*dyslexia decomposed across reversal, mirroring, and transposition dimensions; and (7) a Wav2Vec2-base-960h pronunciation scoring engine with Orton-Gillingham colour-coded phonics display. Pilot evaluation across 30 children (5 diagnostic groups) demonstrated significant improvements in phonological accuracy, graphomotor fluency, and sustained engagement across all cognitive modules.

**Keywords:** Dyslexia, Edge AI, Convolutional Neural Networks, Affective Computing, Graphomotor Analysis, Phonological Assessment, Adaptive Learning

---

## I. Introduction

Dyslexia manifests as systematic spatial processing errors — letter reversals (b↔d, p↔q), transposed sequences (was→saw), and mirror confusions — rather than any deficit in global intelligence. The World Health Organization classifies it under specific learning disorders (ICD-11: 6A03.0), affecting an estimated 700 million individuals worldwide. Early, targeted intervention during the critical literacy window (ages 4–10) is universally recognised as the most effective treatment strategy; however, access to qualified speech-language pathologists and educational psychologists remains severely limited in low- and middle-income settings.

Digital educational tools have partially addressed this access gap, but introduce three critical failure modes. First, they deliver static curricula that ignore a child's real-time affective state — presenting the same high-demand phonics exercises regardless of whether the child is fatigued, anxious, or in a flow state [3], [16], [19], [23]. Second, they transmit facial expressions, voice recordings, and handwriting samples of minors to third-party cloud inference servers, creating insuperable legal barriers under COPPA (USA) and GDPR (EU) [4], [7]. Third, they lack clinical-grade diagnostic output, providing only gamified scores rather than the structured biomarker reports that speech therapists and educational psychologists require [6], [8], [20].

This paper addresses all three failure modes through the following verified technical contributions:

1. A **privacy-preserving dual-channel biometric engine** executing entirely on-device, with a novel microphone arbitration protocol preventing sensor conflicts during concurrent activities.
2. A **composite-scoring adaptive curriculum engine** that continuously reorders teaching content based on real-time skill weakness mapping, spaced-repetition intervals, frustration history, and novelty drive.
3. A **cubic Bezier guided tracing system** with proximity-physics interaction and a parallel seven-category clinical kinematic extractor operating independently in a background shadow engine.
4. A **Multi-Task Micro-CNN** jointly trained via Focal Loss on two heterogeneous datasets with masked gradient propagation, simultaneously solving character identity, spatial orientation, and clinical risk scoring in a single 18 ms forward pass.
5. A **formulated Dyslexia Risk Index** that mathematically separates pathological spatial reversal from generic poor penmanship through calibrated per-error-type coefficients.

**Accessibility by Design:** Every component of the system was designed with dyslexia-specific cognitive accommodations. The OpenDyslexic typeface is applied system-wide. Letter spacing is computationally widened to 11.2 px (settings.dyslexiaFormattingEnabled → 32 × 0.35). The platform supports Lexend, Roboto, OpenSans, and AtkinsonHyperlegible fonts. A dyslexicDark theme inverts contrast ratios. All text-to-speech operates at a reduced rate (0.8×) in the child's active locale (English, Hindi, Tamil).

---

## II. System Architecture and Technology Stack

The platform is structured across three privacy-preserving tiers, all co-located within the child's home network (Figure 1):

- **Tier 1 — React Native (Expo) Mobile Frontend:** Manages touch input, camera sensor, microphone, SVG rendering, and all screen navigation. Handles TTS via expo-speech.
- **Tier 2 — FastAPI Python Backend (Local):** Hosts all ML models in memory at startup. Exposes REST endpoints for emotion analysis, phoneme scoring, and handwriting inference. Connects to SQLite via SQLAlchemy ORM.
- **Tier 3 — SQLite Database:** Stores session telemetry, phonics practice history, emotion readings, user profiles, and JWT authentication tokens. All data persists locally; no external writes.

> 📷 **[FIGURE 1 — Place Here]:** System architecture diagram showing three tiers. Annotate three inference pipelines: (A) Camera/Mic → EmotionTracker → FastAPI `/analyze-emotion` → Concentration Index → PathEngine; (B) Canvas touch → ShadowFeatureExtractor → CNN inference → SessionSummary; (C) AudioRecorder → FastAPI `/evaluate` → Phoneme Score → Phonological AssessmentResult.

**Table 1: Complete Technology Stack**

| Layer | Technology | Specific Role |
|---|---|---|
| Mobile UI | React Native (Expo SDK 50) | Screen rendering, navigation, touch capture |
| Camera / Emotion | FER + MTCNN | 7-class facial emotion, 5s interval |
| Acoustic Emotion | Wav2Vec2-XLSR-SER (53 languages) | 3s audio clip, 7-class prosodic analysis |
| Phoneme Scoring | Wav2Vec2-base-960h | CTC-Loss pronunciation alignment |
| Phonics Decomposition | CMU Pronouncing Dict + G2P | ARPAbet → IPA → Orton-Gillingham |
| Handwriting Stage 1 | Multi-Task Micro-CNN (~380k params) | Identity + Orientation + Risk per character |
| Handwriting Stage 2 | Micro-CRNN + BiLSTM + CTC | Word transcription + transposition detection |
| Clinical Index | *P*dyslexia formula | Weighted risk score per word |
| Adaptive Curriculum | PathEngine (TypeScript) | Composite-scored daily lesson generation |
| Progress Tracking | PathProgressBridge + Achievement Points (AP)Engine | Session recording, Achievement Points (AP)/badge computation |
| REST Server | FastAPI (Python 3.10) | ML inference, analytics, auth |
| Persistence | SQLite + SQLAlchemy | COPPA-compliant local data store |
| Authentication | JWT HS256 | Role-based Child/Parent/Therapist access |
| Session Storage | AsyncStorage (React Native) | Module progress keys, 50-session rolling window |

The Zero-Cloud constraint is enforced architecturally: all FastAPI endpoints accept only local-network HTTP requests. No external DNS, CDN, or cloud API is invoked at any point during child interaction.

---

## III. Real-Time Emotion Detection via Dual-Channel Biometric Fusion

### A. Camera Channel: Facial Expression Recognition (5-Second Interval)

The `EmotionTracker` component mounts a 0.1 × 0.1 px `CameraView` tracking element. A 5s temporal loop captures zero-quality, unprocessed base64 frames to minimize latency. The frame is POSTed to the `/analyze-emotion` endpoint where FER+MTCNN executes a three-stage cascade (Proposal Network → Refine Network → Output Network) to detect and affine-align the child's face [26], [27]. The aligned 160 × 160 px crop is classified over seven emotion states *E*v [9], [25]:

$$E_d = \arg\max_{e \in E_v} P(e), \quad E_v = \{\text{neutral, happy, surprise, sad, angry, fear, disgust}\} \tag{1}$$

A consecutive-failure counter `faceFailCountRef` increments on every no-face frame. After two consecutive failures, the system automatically activates the acoustic fallback channel.

### B. Acoustic Fallback: Wav2Vec2-XLSR-SER (3-Second Clip)

Before initiating audio capture, the `AudioSessionManager` singleton applies priority-based lock arbitration. If the microphone is currently held by the Phonological Articulation Module (active child pronunciation session), the emotion audio request is silently evicted — preventing sensor conflict. If the microphone is idle, a three-second `Audio.Recording` at LOW_QUALITY is captured. An amplitude silence gate discards uninformative frames:

$$\text{if } \max|x(t)| < 0.005 \Rightarrow \text{discard clip} \tag{2}$$

Valid clips are processed by Wav2Vec2-XLSR-SER (trained across 53 languages) classifying *E*a = {angry, disgust, fear, happy, neutral, sad, surprise}. Each logged data point carries an explicit `source` field (`'face'` or `'audio'`) enabling per-channel disaggregation in clinical reports.

**Critical Design for Dyslexia:** Dyslexic children exhibit disproportionately high baseline anxiety during reading and writing tasks. The five-second facial polling interval was deliberately chosen to be non-intrusive — the invisible camera view does not create a sense of surveillance or performance pressure. The acoustic fallback activates only when no face is visible, ensuring continuous monitoring during physical repositioning.

### C. Heuristic Concentration Index (*C*ᵢ)

Both channels compute a unified Concentration Index *C*ᵢ ∈ [0, 100]:

$$C_i = \max\!\left(0, \min\!\left(100, P_{eng} - \lambda N_{dis}\right)\right) \tag{3}$$

$$P_{eng} = 100\,p_{\text{neutral}} + 70\,p_{\text{happy}} + 50\,p_{\text{surprise}} \tag{4}$$

$$N_{dis} = 80\,p_{\text{sad}} + 100\,p_{\text{angry}} + 100\,p_{\text{fear}} + 100\,p_{\text{disgust}} \tag{5}$$

Neutral receives the highest engagement weight (100) — representing optimal low-arousal focused attention. Fear and anger receive maximum penalties (100 each), reflecting the anxiety-induced cognitive overload that is clinically disproportionate in dyslexic populations [17], [22], [24]. The modality-dependent coefficient λ = 0.5 for the visual channel and λ = 0.4 for the audio channel, buffering baseline acoustic variance without penalising natural vocalisation during learning.

> 📷 **[FIGURE 2 — Place Here]:** Two-panel collage. LEFT: Live facial detection overlay showing 7-class probability bars with FER bounding box. RIGHT: Real-time Concentration Index gauge displaying score (0–100), state label (Focused / Engaged / Frustrated), and source indicator (face/audio).

---

## IV. Adaptive Curriculum Engine and Achievement Points (AP) Reward System

### A. PathEngine: Composite-Scored Daily Lesson Generation

The curriculum is organised into five sequential units spanning 41 learning nodes. Each node declares a `skillTag` (letter_tracing, phonics, rhyming, sight_words, magic_words, visual_discrimination, writing), a `difficulty` tier (beginner/intermediate/advanced), `prerequisiteIds`, and a `reviewIntervalDays` for spaced repetition. The `PathEngine.generateDailyLesson()` method scores all candidate nodes using:

$$\text{score}(n) = 0.60\,W_s(n) + 0.25\,SR(n) + 0.15\,NV(n) - D(n) - T(n) \tag{6}$$

where *W*s(n) is the normalised skill-weakness score for the node's tag (1.0 = very weak, 0.0 = mastered), *SR*(n) is the spaced-repetition boost (1.0 if not completed in ≥7 days and best score <80%; 0.6 if ≥5 days; 0.3 if ≥3 days), *NV*(n) = 1.0 for never-attempted nodes, *D*(n) is a difficulty penalty (0.8 for advanced, 0.4 for intermediate) applied when `frustrationEventCount ≥ 3`, and *T*(n) = 2.0 if the node was already completed today. The resulting top five nodes are **engagement-ordered**: a medium-difficulty warm-up → peak challenge node → gamified fun node last, ensuring sessions close on a positive affective register.

When *C*ᵢ < 40 (Mild Frustration), the Neuro-Responsive Pivot activates: the active module's difficulty is lowered by one tier, peripheral UI elements reduce to 20% opacity (Zen Mode), and OpenDyslexic font is enforced, directly counteracting the visual crowding and letterform mirror-confusion that frustration amplifies in dyslexic learners. At *C*ᵢ < 20 (Severe Overload), the session is paused and the child is rerouted to free-form letter tracing — the lowest-demand activity in the system.

### B. PathProgressBridge: Standardised Session Telemetry

Every module writes a `BridgeSession` record to one of six `AsyncStorage` keys (phonicCheckProgress, rhymeTimeProgress, visualDiscrimProgress, sightWordProgress, magicWordsProgress, letterTracingProgress) via `appendSession()`. A 50-session rolling window caps local storage growth. `ProgressAggregator` reads all six keys plus two legacy stores to build a `ChildProgressModel` consumed by the PathEngine on each session start. A `dysPath_meta` per-letter mastery map tracks running average accuracy across all attempts per character.

### C. Achievement Points (AP)Engine: Multi-Factor Reward Calculation

$$Achievement Points (AP)_{total} = (Achievement Points (AP)_{base} + B_{accuracy} + B_{speed} + B_{first}) \times M_{streak} \tag{7}$$

Accuracy bonus tiers: score ≥ 95% → 150% of base Achievement Points (AP); ≥ 85% → 75%; ≥ threshold → 25%. Achievement Points incorporate multi-tier completion speed bonuses, first-attempt multipliers, and longitudinal streak multipliers (up to 2.0×). Sixteen badge milestones gate on score thresholds (Accuracy Mastery ≥90%, Execution Mastery ≥95%), module completion counts, Achievement Points (AP) milestones (100/500/1000 Achievement Points (AP)), and consecutive streak days (3/7/30). All badges persist to `dysPath_badges` in AsyncStorage.

**Table 2: Achievement Points (AP)Engine Badge Milestone Summary**

| Badge | Trigger Condition | Module |
|---|---|---|
| Accuracy Mastery | Phonics accuracy ≥ 90% | Phonological Assessment |
| Execution Mastery | Tracing accuracy ≥ 95% | Letter Tracing |
| Phonological Mastery | 5 rhyme nodes completed | Phonological Awareness Task |
| Dynamic Sight-Word Task | 3 sight-word nodes completed | Dynamic Sight-Word Task |
| Initial Engagement | 3-day consecutive streak | All modules |
| Sustained Engagement | 7-day consecutive streak | All modules |
| Accumulated Progression | 100 total Achievement Points (AP) earned | All modules |
| Curriculum Unit Completion | Complete any full curriculum unit | All modules |

---

## V. Interactive Letter Tracing and Graphomotor Biomarker Extraction

### A. Cubic Bezier Parameterization and Device-Invariant Scaling

All 26 uppercase letters are encoded as cubic Bezier SVG path strings in the `ScalableLetters` dictionary. A custom parser maps the normalised 100 × 100 coordinate space to physical screen pixels via uniform scale (SVG_SCALE = 4.6). Each Bezier curve segment is sampled at 60 equidistant parameter values:

$$\mathbf{B}(t) = (1-t)^3\mathbf{P}_0 + 3(1-t)^2 t\mathbf{P}_1 + 3(1-t)t^2\mathbf{P}_2 + t^3\mathbf{P}_3, \quad t \in [0,1] \tag{8}$$

Per-point tangent angles are computed via $\theta_i = \text{atan2}(\Delta y, \Delta x)$ and stored alongside each sampled point. Letter-specific width corrections are applied: narrow letters (C, G, M, N, P) scaled to 0.88×; oval forms (O, Q, R) to 0.84×; extra-narrow (H, I) to 0.78×.

### B. Child-Facing stylus cursor Interaction and Rainbow Trail

The `SegmentTracer` component presents a glowing directional stylus cursor (radius 18 px) at each stroke start. The child physically drags the stylus cursor along the letter path. Nearest-path-point identification uses squared Euclidean distance (avoiding `sqrt` overhead):

$$\hat{i} = \arg\min_{i} \left[(x_t - p_x^{(i)})^2 + (y_t - p_y^{(i)})^2\right] \tag{9}$$

A 35 px hard proximity tolerance enforces on-track validation (d² ≤ 1,225). Off-track contact turns the progress trail red (#F87171) — immediate visual error feedback without audio punishment, designed to avoid the conditioned anxiety response observed in dyslexic learners under negative reinforcement. A forward-only progression lock applies: `progressIndex = max(prev − 15, nearest)`, permitting ±15 point back-slack for hesitant dysgraphic corrective micro-movements. A loop-closure detector resolves closed letterforms (O, Q): when `progressIndex > N − 30` and the nearest point index < 20, progress locks at 100% and completion fires.

The child's on-track progress renders as a multicoloured SVG LinearGradient trail (pink → purple → blue → teal, strokeWidth 16). Four ambient radial-gradient ambient visual depth enhancements float behind the canvas using sinusoidal drift animations (5–12 s periods), creating visual depth without distracting from the tracing zone. The gradient palette adapts per theme: **dyslexicDark** mode (cyan-blue-violet) vs. standard warm mode (red-teal-yellow) — directly responsive to the clinical literature indicating that dark backgrounds with high-contrast pastel text reduce visual stress in dyslexic readers.

### C. Stroke Completion Reward System

Upon stroke completion, animated positive reinforcement particles mitigate task exhaustion. Full letter completion triggers interactive pedagogical agents to replay the tangential path traversing the Bezier geometry, paired with slow-rate (0.8×) localized TTS vocalization. An A–Z horizontal letter picker strip enables targeted practice on specific clinically confusable pairs (b/d, p/q).

> 📷 **[FIGURE 3 — Place Here]:** Four-panel collage. TOP-LEFT: Active guided tracing screen showing multicoloured visual feedback trail on letter 'A', animated guide dots pulsing along path, pedagogical agent bottom-left, and ambient ambient visual depth enhancements. TOP-RIGHT: Reward animation with 🐝 actor traversing completed letter with honey drop at segment end. BOTTOM-LEFT: Clinical TracingScreen showing white ink trail with numbered stroke start circles. BOTTOM-RIGHT: Session Summary Diagnostic tab showing Dyslexia/Dysgraphia/Reversal risk bars.

### D. Clinical Shadow Engine and 7-Category Kinematic Report

In parallel, the `ShadowFeatureExtractor` silently records `{x, y, timestamp, pressure}` tuples on every touch event, fully decoupled from the visual rendering pipeline. No kinematic data influences the rendering loop. Three session completion states are tracked: `completed`, `abandoned`, `timed_out`. Only completed sessions are persisted. `generateSessionSummary()` computes the following seven clinical biomarker categories:

**Table 3: Seven-Category Graphomotor Biomarker Report**

| Category | Extracted Metrics | Clinical Significance |
|---|---|---|
| **1. Kinematics** | Mean velocity, peak velocity, velocity CoV, fluency ratio, peaks/valleys count, time-in-motion | Identifies slow, hesitant stroke execution characteristic of dysgraphia [18], [21] |
| **2. Dynamics** | Avg jerk, normalised jerk, max acceleration, acceleration symmetry, ballistic movement count | Detects neuromotor coordination deficit vs. deliberate control |
| **3. Graphomotor** | Tremor amplitude, tremor frequency, tremor power, avg pressure, pressure variance | Isolates pathological micro-tremors and grip dysfunction |
| **4. Shape/Spatial** | Mean path deviation, off-track events, aspect ratio, compactness, closure rate, spatial drift | Measures geometric accuracy against ideal Bezier reference |
| **5. Sequencing/Timing** | Stroke count actual vs expected, extra strokes, lift-off count, inter-stroke latency | Detects stroke order confusion and lift-off patterns |
| **6. Orientation/Mirroring** | Reversal detected flag, mirror confusion score, micropause count | Quantifies directional confusion events per letter |
| **7. ML Predictions** | Top-3 CNN character matches with confidence % | Neural probability map for the drawn character |

The Session Summary renders across three tab views (Overview, Detailed, Diagnostic) alongside risk bars for Dyslexia, Dysgraphia, and Reversal risk, providing clinicians with a structured one-page biomarker snapshot per session.

---

## VI. End-to-End Handwriting Analysis: From Canvas Input to Clinical Dyslexia Risk Score

### A. Freehand Writing Canvas and Geometric Spatial Reversal Classification

The `WritingAssessmentScreen` presents a free-form canvas prompted with randomised alphabet characters. Multi-stroke paths are rasterized into a `Float32Array` tensor and forwarded to the `ModelService`. If the top-1 CNN prediction differs from the target, three geometric augmentation tests apply sequentially (horizontal flip, vertical flip, and 180° rotation) to precision-classify the spatial error. TTS audio feedback prompts each challenge character at 0.8× rate.

### B. Multi-Task Micro-CNN: Multi-Task Micro-CNN (Stage 1)

**Clinical Motivation:** Character-level reversal detection requires distinguishing three clinically distinct states — correct formation, spatial reversal (b→d), and a corrected/scribbled attempt. Standard single-task classifiers cannot provide this distinction. Multi-Task Micro-CNN solves all three simultaneously via three independent output heads sharing one convolutional backbone.

**Training Corpus:** EMNIST ByClass (697,932 samples, 62-class ground-truth character identity, 28×28 grayscale) is fused with the Kaggle Synthetic Dyslexia Dataset (~138,500 individual character crops annotated for spatial orientation: 0=Normal, 1=Reversal, 2=Corrected). Kaggle samples carry label = −1 to mask their contribution from the identity-head gradient via a mask **M** = (y ≠ −1).

**Architecture:** Multi-Task Micro-CNN (~380k parameters) applies three progressive 3×3 convolutional blocks before Global Average Pooling to a 256-D feature vector. Three heads decode this vector independently to solve three tasks simultaneously: 62-class character identity, 3-class spatial orientation (Normal, Reversal, Corrected), and binary clinical risk.

**Training:** The network is jointly trained on EMNIST ByClass and the Kaggle Synthetic Dyslexia Dataset. Rather than standard cross-entropy, the architecture utilizes Focal Loss ($\gamma = 2.0$) to dynamically up-weight hard, clinically significant dyslexia confusion pairs (e.g., b/d, 1/I/l, p/q) over trivial standard characters, significantly boosting reversal discrimination.

> 📷 **[FIGURE 4 — Place Here]:** Training curve panel: (A) multi-task loss over 12 epochs; (B) 62-class validation accuracy; (C) orientation head validation accuracy. Mark epoch of best validation checkpoint.

> 📷 **[FIGURE 5 — PRIORITY / Cover Candidate]:** Zoomed 22-character dyslexia confusion pair matrix. Highlight b/d, p/q, m/w, n/u, 1/I/l cells. Annotate per-pair accuracy improvement from baseline (cross-entropy) to Focal Loss.

**Table 4: Multi-Task Micro-CNN Clinical Diagnostics Benchmarks**

| Metric | Value |
|---|---|
| 62-Class Identification Accuracy | **84.2%** |
| Macro F1 Score | **82.7%** |
| Dyslexic Pair Subset Accuracy (22 chars) | **79.1%** |
| b/d Pair Discrimination | 81.2% (+10.2% over baseline) |
| Spatial Reversal Sensitivity (3-class) | **96.7%** |
| Normal Character Specificity | **97.2%** |
| Mean Inference Latency (CPU, 28×28) | **~18 ms** |
| Model File Size (.pth uncompressed) | **~1.5 MB** |
| Parameter Count | **~380k (29× fewer than ResNet-18)** |

**Live Inference API:** The `HandwritingAnalyzer` singleton loads the `.pth` checkpoint at FastAPI startup. The `/analyze-handwriting` endpoint accepts a base64 canvas DataURI, applies EMNIST-compatible preprocessing (background inversion if white-dominant, bounding-box crop to stroke extent, Lanczos resize to 28×28), and returns: `top_3` (three character predictions with confidence), `orientation` (Normal/Mirrored-Reversed/Scribbled-Corrected), `dyslexia_risk_percentage` (0–100%), and `dyslexia_flag` (clinical warning string).

### C. Micro-CRNN with CTC Decoding: Word Transcription and Transposition Detection (Stage 2)

Character-level classifiers cannot detect transposition errors (was→saw) because the characters are individually correct but sequentially inverted. A Convolutional Recurrent Neural Network trained on a synthetically stitched dataset captures this clinical pattern. A CNN backbone produces temporal feature vectors, while a Bidirectional LSTM reads the sequential dependencies. Connectionist Temporal Classification (CTC) Loss decodes the transcribed word without requiring explicit character boundary annotations.

### D. Dyslexia Risk Index *P*dyslexia: Clinical Quantification Formula (Stage 3)

The Dyslexia Diagnostic Engine algorithmically evaluates the CRNN transcription output against the prompted target word to compute a weighted clinical risk score ($P_{dyslexia}$). Mathematical weights are applied based on the detected error type: $\alpha = 1.0$ for known reversal pair triggers (b↔d, p↔q), $\beta = 0.8$ for CNN orientation-head "Reversal" probability, and $\gamma = 1.2$ for full anagram transpositions (the most pathognomonic dyslexia indicator, representing sequence memory failure rather than standard spatial confusion).


## VII. Pronunciation Scoring Engine and Orton-Gillingham Phonics Display

### A. CTC-Loss Pronunciation Alignment (Phonological Articulation Module)

The `Phonological AssessmentStudioScreen` operates in two modes: **custom** (parent/therapist types any target word) and **adaptive** (automatically loads CVC-level words from `phonicsDatabase` Level 1, presenting 5 words per session with ◀/▶ navigation). Critically, the `EmotionTracker` is explicitly set `isActive={!isRecording}` during all audio recording periods — a hard software interlock preventing the AudioSessionManager from attempting simultaneous phoneme recording and emotion audio capture.

Child speech is captured via `AudioRecorder.startRecording()`. The `/evaluate` endpoint loads `Wav2Vec2-base-960h` globally at server startup. Rather than greedy decoding — which fails on developing pediatric speech — the engine measures the CTC likelihood of the *target word* given the acoustic input:

$$\text{Confidence} = e^{-\mathcal{L}_{CTC}} \tag{19}$$

A structural score boost applies based on CTC loss magnitude: L < 0.5 → +50 points; 0.5–1.5 → +30 points; 1.5–3.0 → +10 points. A multi-algorithm composite scoring layer fuses fuzzy string matching with phonetic algorithms:

$$S_{base} = 0.6 \cdot \text{Ratio}(T,A) + 0.4 \cdot \text{PartialRatio}(T,A) \tag{20}$$

Phonetic boosts Δ apply via Metaphone (+30), Soundex (+20), and Match Rating Approach (+15) on match. A dyslexia generosity correction adjusts the final score: S > 70 → +10; S < 40 → −10. Per-phoneme character-level Metaphone matching generates a colour-coded correct/unclear feedback array.

**Accessibility:** The `Phonological AssessmentStudioScreen` applies `settings.dyslexiaFormattingEnabled` to compute letter spacing as 32 × 0.35 = 11.2 px on the word display card, significantly reducing inter-letter visual crowding. The word is rendered in OpenDyslexic typeface at 48 px size. Clinically appropriate letter-spacing reduces orthocentre misidentification by ~23% in dyslexic readers (cf. Zorzi et al., 2012).

### B. Multisensory Phonics Module: CMU Dictionary + G2P + IPA + Orton-Gillingham Colour Coding

The CMU Pronouncing Dictionary decomposes vocabulary into ARPAbet phonemes at confidence 1.0. On cache-miss, a priority-ordered G2P regex fallback triggers at confidence 0.6. Results are mapped to IPA via vowel-adjacency syllabification and rendered using the Orton-Gillingham colour-coded grapheme segmentation framework — the gold-standard multisensory clinical literacy teaching method (Orton, 1928; Gillingham and Stillman, 1956), systematically linking phoneme, grapheme, and articulatory information. Variable-speed TTS (normal: 0.5×, slow: 0.15×, per-syllable: 0.2×) provides isolated phoneme boundary perception without blending pressure. A Wikipedia-linked visual word association builds semantic-phonological linkages.

> 📷 **[FIGURE 6 — Place Here]:** Two-panel collage. LEFT: Phonological Articulation Module microphone screen with pulsing ring animation during recording, word card in OpenDyslexic font, per-phoneme colour coded feedback bars showing correct/unclear per phoneme. RIGHT: Multisensory Phonics Module PronunciationCard showing Orton-Gillingham grapheme colour segments, IPA breakdown, and TTS speed selector buttons.

---

## VIII. Gamified Cognitive Screening Modules and Clinical Phonological Assessment

Five gamified modules embed standardised diagnostic screening within interactive play, bypassing the test-anxiety response that formal assessment generates in dyslexic children.

**Visual Discrimination — Visual Discrimination Task:** Generates character grids of 2×2 (levels 1–2), 3×3 (levels 3–5), and 4×4 (levels 6+). The target letter cycles between selected clinically confusable pairs (b/d, p/q). Progress is recorded to `PathProgressBridge` every 3 correct answers. This module administers a standardised visual discrimination battery without requiring any reading from pre-literate children.

**Phonological Awareness Task — Phonological Awareness:** A 🐸 "interactive pedagogical agent" mascot presents a target word with emoji image. Correct selection earns a **consecutive success multiplier**: score = +10 × comboCount, growing with consecutive streak. Wrong selection resets combo and triggers a card shake animation — no lives deducted, removing punishment pressure. Progress is recorded every 5 correct answers. Phonological awareness is the strongest single predictor of dyslexia risk (Snowling, 2000).

**Dynamic Sight-Word Task — Zen Sight-Word Fluency:** Words float across the screen with sinusoidal bobbing. A PanResponder slash gesture checks collision with 30 px forgiveness padding — accommodating dyslexic imprecise touch motor control. **No lives system** ("Zero-Penalty Mode" mode): wrong word contact triggers speech correction and a physics bounce-away recoil rather than failure penalty. All word text renders in OpenDyslexic font at 34 px with 2 px letter-spacing.

**Letter Tracing and Writing Practice:** Both the guided tracing system (TracingScreen) and freehand assessment (WritingAssessmentScreen) write records to `letterTracingProgress` and update the `dysPath_meta` per-letter mastery map. Completion of the guided system awards 85% baseline accuracy (self-correcting by design).

**Clinical Phonological Assessment Report (MedicalReportScreen):** After sustained phonics practice, the `ReportGenerator` synthesises the complete practice history into a structured clinical export: total sessions, average accuracy, **Consistency Score** (0–100), progress trend (improving / stable / declining), ranked **weakest phonemes** with per-phoneme average accuracy and attempt count, ranked **strongest phonemes**, and auto-generated clinical recommendations. The export function calls `Share.share()` to produce a plaintext "CLINICAL PHONOLOGICAL ASSESSMENT REPORT" suitable for sharing with a speech-language pathologist or educational psychologist — bridging the in-app diagnostic data to formal clinical workflow.

> 📷 **[FIGURE 7 — Place Here]:** Strip of five screenshots (left to right): Visual Discrimination Task 3×3 grid with confusable b/d pair; Dynamic Sight-Word Task sight-word balloon floating; Phonological Awareness Task "interactive pedagogical agent" with three option cards; Multisensory Phonics Module pronunciation card; MedicalReportScreen showing weakest phoneme bars and Export button.

---

## IX. Longitudinal Clinical Reporting and Parental Safety Infrastructure

### A. Affective Analytics Report

`EmotionReportScreen` surfaces both live session data (from `EmotionContext.sessionData`) and historical data (from the SQLite-backed `/analytics/emotion-report` endpoint). Per-feature cards display: dominant emotion, Concentration Index bar (green > 70%, amber > 45%, red otherwise), face-vs-audio source breakdown proportion bar, and expandable per-channel emotion pip breakdowns showing all seven emotion class probabilities. A sync button posts local session data to the backend for longitudinal aggregation across days and weeks, enabling trend analysis for therapeutic planning.

### B. Learning Journey and AI Pedagogical Insight Report

`LearningJourneyReportScreen` synthesises a 7-bar sparkline of the last seven emotion readings colour-coded by *C*ᵢ level; per-feature activity rows with mini-bar, emotion chip tags, and reading counts; the five most recent phonics words with timestamps; and a 4-stat hero card (Phonics Accuracy, Focus Score, Activities count, AI Readings). `generateInsight()` produces an AI-authored paragraph-length pedagogical observation auto-tagged with clinical hashtags (#HighFlow, #PhonicMastery, #MultiModal, #DyslexiaSupportActive) — formatted for parent communication. A printed "UNIFIED LEARNING OFFICIAL PEDAGOGICAL AUDIT 2026" seal badge renders at the footer, designed for sharing with therapists.

### C. Home Dashboard: Primary Progress Indicator

The `HomeScreen` renders a full-width `LinearGradient` Primary Progress Indicator directly from `useLearningPath()` context — displaying today's activity count, Achievement Points (AP) earned today, continuous engagement metric, and a state-adaptive button ("Go →" vs "✅ Today Complete!") — giving parents, therapists, and children an immediate single-glance daily progress summary. The dashboard aggregates navigation to all 9 modules and clinical reports.

### D. Parental Dashboard and Role-Based Access Control

The Parental Dashboard, accessible only behind a four-digit PIN Parental Gate over an active JWT session, exposes:
- **Screen Time Limit:** Clinically clamped 15–120 minutes/day (WHO and AAP pediatric guideline bounds). In-app alert fires at 5 minutes before limit.
- **AI Frustration Sensitivity:** Three-tier slider (Low/Medium/High) controlling the *C*ᵢ threshold at which the Neuro-Responsive Pivot activates.
- **Maximum Difficulty Ceiling:** Segmented control (Beginner/Intermediate/Advanced) hard-capping the PathEngine difficulty selection.
- **Full Data Clear:** Two-step irreversible confirmation guard preventing accidental child data deletion.

JWT HS256 enforces three roles: **Child** (write-only session logs), **Parent** (read reports, navigate clinical screens), **Therapist** (read all clinical data, write curriculum configuration). All FastAPI endpoints validate the JWT token on every request via dependency injection.

> 📷 **[FIGURE 8 — Place Here]:** Two-panel collage. LEFT: Emotion Report dark UI showing per-feature ConcentrationBar, face/audio source breakdown, and expandable emotion pip detail. RIGHT: Learning Journey Report showing AI Pedagogical Insight paragraph, 7-bar Ci sparkline, and AUDIT 2026 seal at footer.

---

## X. Experimental Evaluation and Pilot Study Results

A controlled pilot study was conducted across 30 children (ages 5–10) spanning five diagnostic groups, with each child completing a minimum of four independent sessions across all modules over a two-week period.

**Table 6: Study Participant Demographics**

| Diagnostic Group | N | Age Range | Primary Diagnosis | Avg Sessions |
|---|---|---|---|---|
| Dyslexia (Mild) | 9 | 5–8 | Reading/Phonological | 6.2 |
| Dyslexia (Moderate) | 6 | 6–10 | Reading + Dysgraphia | 5.8 |
| ASD (Verbal) | 4 | 5–9 | Social-Communication | 4.9 |
| ADHD | 5 | 6–10 | Attention-Deficit | 5.1 |
| Neurotypical (Control) | 6 | 5–9 | — | 7.0 |
| **Total** | **30** | **5–10** | — | **5.8** |

**Table 7: Per-Module Concentration Index and Affective Engagement**

| Module | Avg *C*ᵢ Face | Avg *C*ᵢ Audio | Dominant Emotion | Avg Flow Score |
|---|---|---|---|---|
| Letter Tracing (Guided) | 74.2 | — | Neutral | 76.5 |
| Multisensory Phonics Module | 69.8 | 71.5 | Happy | 78.2 |
| Phonological Articulation Module | 62.4 | 68.9 | Neutral | 69.8 |
| Phonological Awareness Task | 75.1 | — | Happy | 81.4 |
| Dynamic Sight-Word Task | **78.4** | — | Happy | **84.6** |
| Visual Discrimination | 67.2 | — | Neutral | 72.1 |
| Writing Assessment | 71.3 | — | Neutral | 74.8 |

**Table 8: Phoneme Accuracy by Word Complexity (Wav2Vec2 CTC Scoring)**

| Phoneme Category | Example Words | Avg *S*final | Avg *L*CTC | Avg Confidence |
|---|---|---|---|---|
| CVC Simple | cat, dog, sun, bed | 85.2% | 0.38 | 68.4% |
| CCVC Moderate | flag, trip, drum, stop | 72.4% | 1.05 | 47.2% |
| Polysyllabic Complex | butterfly, elephant | 59.8% | 2.64 | 20.1% |
| Irregular Sight Words | the, was, said, have | 81.1% | 0.72 | 55.6% |

**Table 9: System Clinical Diagnostics and Inference Latency Benchmarks**

| Component | Metric | Value |
|---|---|---|
| Multi-Task Micro-CNN | Identification Accuracy | 84.2% |
| Multi-Task Micro-CNN | Reversal Sensitivity | 96.7% |
| Multi-Task Micro-CNN | Inference Latency (CPU) | ~18 ms |
| FER + MTCNN | Emotion Classification Latency | ~50 ms |
| Wav2Vec2-XLSR-SER | Acoustic Emotion Latency | ~200 ms |
| Wav2Vec2-base-960h | Phoneme Scoring Latency | ~480 ms |
| Micro-CRNN | Word Transcription Latency | ~65 ms |
| PathEngine | Daily Lesson Generation | <10 ms |
| Full Session End-to-End | Canvas → Risk Score | ~83 ms |

> 📷 **[FIGURE 9 — Place Here]:** Bar chart comparing average Concentration Index (*C*ᵢ) across all seven modules for dyslexic vs. neurotypical groups. Overlay: frustration event count per module. Annotate the Dynamic Sight-Word Task peak engagement and Phonological Assessment audio-channel complementarity.

---

## XI. Discussion: Clinical Validity, Affective Complementarity, and Curriculum Personalisation

**Focal Loss and Dyslexic Pair Discrimination:** The Focal Loss mechanism (γ = 2.0) lifted b/d pair discrimination accuracy from 71.0% (standard cross-entropy ablation) to 81.2% — a 10.2 percentage point gain. This validates the clinical design decision: standard cross-entropy treats all 62-class errors equally, while Focal Loss concentrates gradient on the small set of hard clinically significant pairs. The 96.7% reversal sensitivity confirms that the three-head architecture successfully separates spatial orientation from character identity without mutual interference between the heads.

**P*dyslexia Three-Tier Discrimination:** The formulated risk index cleanly separates three clinical tiers: arbitrary misclassification (0–15%), spatial reversal errors (33–78%), and full transposition events (100%). Transposition events (was→saw) consistently saturate the index, validating the γ = 1.2 coefficient as correctly identifying letter sequence memory failure as the most pathognomonic dyslexia indicator. Importantly, normal misspellings that do not involve spatial reversal or sequence inversion score below the 15% clinical threshold, preventing false-positive clinical flags.

**Dual-Channel Affective Complementarity:** The per-module *C*ᵢ data (Table 7) reveals genuine complementarity between channels. Dynamic Sight-Word Task generated the highest facial *C*ᵢ (78.4) due to heightened visual engagement but showed higher acoustic variance from excited vocalisation. Phonological Articulation Module generated the lowest facial *C*ᵢ (62.4) as children focus on pronunciation posture, but improved audio *C*ᵢ (68.9) because pronunciation effort produces richer prosodic signal. The modality-adaptive λ coefficient (0.5 visual, 0.4 audio) successfully resolved this cross-modal variance without generating false-positive "Frustrated" classifications that would incorrectly trigger the Neuro-Responsive Pivot.

**Curriculum Personalisation Efficacy:** Children with frustrationEventCount ≥ 3 were reliably routed to Dynamic Sight-Word Task (highest engagement, lowest demand) before returning to phonics tasks. This sequencing produced a consistent 12–18% *C*ᵢ recovery between the frustration trigger event and the next high-demand activity, demonstrating empirical evidence for the PathEngine's emotional-affective curriculum ordering strategy.

**Accessibility Impact:** Dyslexic children in the moderate group showed 23% higher engagement with the guided stylus cursor tracing system compared to the standard freehand writing assessment — consistent with the established literature showing that structured constraint reduces graphomotor anxiety in dysgraphic learners. The "no punishment" philosophy (bouncing words, red trail instead of audio alarm) produced measurably lower frustration event counts in dyslexic vs. ADHD groups, where external negative reinforcement has a documented detrimental effect on task persistence.

---

## XII. Conclusion and Future Directions

This paper presents the Unified Learning App, a Zero-Cloud, Edge AI educational platform that simultaneously eliminates the two principal barriers to AI-assisted dyslexia screening deployment in schools and clinical environments: privacy liability and pedagogical rigidity. By executing all biometric inference — facial emotion recognition, acoustic prosodic analysis, handwriting character recognition, and phoneme scoring — entirely within the local device network, the system achieves full COPPA and GDPR compliance without sacrificing clinical-grade analytical depth.

The Multi-Task Micro-CNN (Multi-Task Micro-CNN) establishes that clinical-grade spatial reversal detection can be deployed at 1.5 MB on commodity hardware with 18 ms latency — 29× more parameter-efficient than ResNet-18 — while achieving 84.2% identification accuracy and 96.7% reversal sensitivity. The formulated *P*dyslexia index provides a mathematically rigorous, interpretable risk quantification that separates pathological spatial confusion from generic penmanship error, offering clinicians a per-word scalar measure grounded in three error-type dimensions rather than an opaque neural score. The dual-channel *C*ᵢ-driven PathEngine demonstrates that real-time affective adaptation of educational content is feasible on consumer Android hardware without cloud dependency [13], [15].

Future work will pursue three extensions: (1) integration of EEG and appearance-based gaze tracking [2], [5], [10], [12] as a tertiary *C*ᵢ input channel for higher-temporal-resolution frustration and smartphone reliance detection [1], [11], [14]; (2) multilingual CRNN expansion to Devanagari (Hindi) and Tamil scripts, extending the diagnostic pipeline to non-Latin orthographies with distinct reversal error patterns; and (3) post-training structured weight pruning to achieve sub-500 KB model size, enabling deployment on low-cost Android tablets in low-resource educational settings.

---

## References

[1] M. Gitimoghaddam, N. Chichkine, L. McArthur, S. S. Sangha, and V. Symington, "Applied behavior analysis in children and youth with autism spectrum disorders: A scoping review," Perspectives on behavior science, vol. 45, no. 3, pp. 521–557, 2022.
[2] J. K. Olsen, A. G. Ozgur, K. Sharma, and W. Johal, "Leveraging eye tracking to understand children's attention during game-based, tangible robotics activities," International Journal of Child-Computer Interaction, vol. 31, p. 100447, 2022.
[3] D. Gadzhinuusieva, S. Melià, G. L. Lledó, and S. S. Nasabeh, "Development and pilot evaluation of an ai-driven learning management system for personalized education for autistic students," Education and Information Technologies, pp. 1–39, 2026.
[4] S. D'Alfonso, S. Coghlan, S. Schmidt, and S. Mangelsdorf, "Ethical dimensions of digital phenotyping within the context of mental health-care," Journal of Technology in Behavioral Science, vol. 10, no. 1, pp. 132–147, 2025.
[5] X. Zhang, Y. Sugano, M. Fritz, and A. Bulling, "Appearance-based gaze estimation in the wild," in Proceedings of the IEEE conference on computer vision and pattern recognition, 2015, pp. 4511–4520.
[6] A. N. Shainhan, M. Qarage, and D. Al-Thairi, "Advancements in automated assessment and diagnosis of autism spectrum disorder through multi-modality sensing technologies: Survey of the last decade," IEEE Transactions on Cognitive and Developmental Systems, 2025.
[7] C. H. Au, J.-H. Hsu, C.-R. Lion, H.-Y. Su, E. C.-L. Lin, and P.-S. Chen, "Automatic bipolar disorder assessment using machine learning with smartphone-based digital phenotyping," IEEE Access, vol. 11, pp. 121 845–121 858, 2023.
[8] Z. Wang, J. Liu, W. Zhang, W. Nie, and H. Liu, "Diagnosis and intervention for children with autism spectrum disorder: A survey," IEEE transactions on cognitive and developmental systems, vol. 14, no. 3, pp. 819–832, 2021.
[9] B. Fang, Z. Li, G. Han, and J. He, "Facial expression recognition in educational research from the perspective of machine learning: A systematic review," IEEE Access, vol. 11, pp. 112 060–112 074, 2023.
[10] J. Li, Z. Chen, Y. Zhong, H.-K. Lam, J. Han, G. Ouyang, Z. Li, and H. Liu, "Appearance-based gaze estimation for aid diagnosis," IEEE Transactions on Cybernetics, vol. 53, no. 7, pp. 6504–6517, 2022.
[11] L. H. Rupp, A. Kumar, M. Sadeghi, L. Schindler-Gmelch, M. Keinert, B. M. Eskofier, and M. Berking, "Stress can be detected during emotion-evoking smartphone use: a pilot study using machine learning," Frontiers in Digital Health, vol. 7, p. 1578917, 2025.
[12] Y.-Y. Chien, C.-H. Lee, J.-N. Chiu, W.-C. Tsai, Y.-C. Min, Y.-M. Lin, J.-S. Wong, and Y.-L. Tseng, "Game-based social interaction platform for cognitive assessment of autism using eye tracking," IEEE Transactions on Neural Systems and Rehabilitation Engineering, vol. 31, pp. 749–758, 2022.
[13] B. Karami, R. Koushki, F. Arabgol, M. Rahmani, and A.-H. Vahabie, "Effectiveness of virtual/augmented reality–based therapeutic interventions on individuals with autism spectrum disorder: a comprehensive meta-analysis," Frontiers in Psychiatry, vol. 12, p. 665326, 2021.
[14] C. Joseph and P. U. Maheswari, "Facial emotion based smartphone addiction detection and intervention using deep learning and video based learning," Scientific Reports, vol. 15, no. 1, p. 18025, 2025.
[15] M. Chistol, C. Turcu, and M. Danubiana, "Autism assistant: A platform for autism home-based therapeutic intervention," IEEE Access, vol. 11, pp. 94 181–94 193, 2023.
[16] A. Page and A. Davis, "The alignment of innovative learning environments and inclusive education: How effective is the new learning environment in meeting the needs of special education learners?," New Zealand Journal of Teachers' Work, vol. 13, no. 2, pp. 81–98, 2016.
[17] N. S. Adi, A. Othman, H. S. Kuay, and Q. M. Mustafa, "A study on the psychological well-being of children with specific learning difficulties and typically developing children," BMC psychology, vol. 12, no. 1, p. 725, 2024.
[18] J. Su, J. Wang, W. Wang, Y. Wang, C. Bunterngchit, P. Zhang, and Z.-G. Hou, "An adaptive hybrid neural network model for upper-limb hand function rehabilitation of stroke patients," IEEE Transactions on Neural Systems and Rehabilitation Engineering, vol. 32, pp. 2950–2960, 2024.
[19] R. Cakir and O. Korkmaz, "The effectiveness of augmented reality environments on individuals with special education needs," Education and Information Technology, vol. 24, no. 2, pp. 1631–1659, 2019.
[20] I. Hassan, N. Nahid, M. Islam, S. Hossain, B. Schuller, and M. A. R. Ahad, "Automated autism assessment with multimodal data and ensemble learning: a scalable and consistent robot-enhanced therapy framework," IEEE Transactions on Neural Systems and Rehabilitation Engineering, 2025.
[21] V. Vilasini, B. Rekha, V. Sandeep, and V. Venkatesh, "Deep learning techniques to detect learning disabilities among children using handwriting [paper presentation]," in Third International Conference on Intelligent Computing Instrumentation and Control Technologies (ICICICT). Kozhikode, 2021. https://doi.org/10.1109/ICICICT54557, 2021.
[22] A. Wallman-Jones, E. R. Palser, F. Noohi, B. Y. Zhang, C. R. Veziris, A. K. Gerenza, A. I. Martinez-Arroyo, M. Shabash, A. R. Roy, S. R. Holley et al., "Elevated facial behavior variability during emotions contributes to better functional communication in dyslexia," Journal of Numerical Cognition, vol. 49, no. 3, pp. 325–343, 2023.
[23] M. S. Contreras-Ortiz, P. P. Marrugó, and J. C. R. Ribon, "E-learning resources for people with autism spectrum disorder: a systematic review," IEEE Access, vol. 11, pp. 49 819–49 832, 2023.
[24] N. Ouherrou, O. Elhammoumi, F. Benmarrakchi, and J. El Kafi, "Comparative study on emotions analysis from facial expressions in children with and without learning disabilities in virtual learning environment," Education and Information Technologies, vol. 24, no. 2, pp. 1777–1792, 2019.
[25] B. Abdellaoui, A. Moumen, Y. E. B. El Idrissi, and A. Remaida, "Machine learning to recognize human emotion and engagement: A systematic review," in 2020 IEEE 2nd international conference on electronics, control, optimization and computer science (icecos). IEEE, 2020, pp. 1–6.
[26] A. K. Balu, Chandrika, G. Rajeswari, U. V. Payani et al., "Face emotion recognition using deep neural network (dnn)," in 2025 IEEE 14th International Conference on Communication Systems and Network Technologies (CSNT). IEEE, 2025, pp. 547–551.
[27] S. H. Ab Hamid, "An android application for facial expression recognition using deep learning," Applied Mathematics and Computational Intelligence (AMCI), vol. 11, no. 2, pp. 505–520, 2022.
---

## Figure Placement Checklist

| Figure | Description | Source | Status |
|---|---|---|---|
| **Fig. 1** | System architecture: 3-tier + 3 inference pipelines | Design diagram | ⬜ To create |
| **Fig. 2** | FER overlay + *C*ᵢ gauge collage | In-app screenshot | ⬜ Capture |
| **Fig. 3** | Four-panel tracing collage | In-app screenshot | ⬜ Capture |
| **Fig. 4** | CNN training curves (loss + accuracy) | `training_curves.png` | ✅ Ready |
| **Fig. 5** | Dyslexic pair confusion matrix (zoomed 22×22) | `confusion_pairs_zoom.png` | ✅ Ready — **Cover candidate** |
| **Fig. 6** | Phonological Articulation Module + Multisensory Phonics collage | In-app screenshot | ⬜ Capture |
| **Fig. 7** | Five-module horizontal strip | In-app screenshot | ⬜ Capture |
| **Fig. 8** | Emotion Report + Learning Journey collage | In-app screenshot | ⬜ Capture |
| **Fig. 9** | *C*ᵢ comparison bar chart (dyslexic vs neurotypical) | Generated from pilot data | ⬜ Create |
