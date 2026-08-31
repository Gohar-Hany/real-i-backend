/**
 * REAL_i Enterprise Production Database Seeding & Mock Data Generator
 * 
 * Sets up a clean, production-grade dataset with real named instructors,
 * students, enriched courses, assessments, graded submissions, live meetings with
 * AI lecture summaries, interactive polls, attendance, and calendar events.
 * 
 * Run: node src/scripts/seed_enterprise_production.js
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Assessment from '../models/Assessment.js';
import Submission from '../models/Submission.js';
import Meeting from '../models/Meeting.js';
import Event from '../models/Event.js';

const MOCK_PASSWORD = 'Password123!';

async function seedEnterpriseData() {
  try {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DATABASE || 'raad-rag';

    console.log(`\n======================================================================`);
    console.log(`🚀 REAL_i ENTERPRISE DATABASE SEEDER & DATA SANITIZER`);
    console.log(`======================================================================\n`);
    console.log(`📡 Connecting to MongoDB Atlas (${dbName})...`);

    await mongoose.connect(uri, { dbName });
    console.log(`✅ MongoDB Connection Established.\n`);

    // ── 1. CLEANUP & PURGE TEST JUNK ──────────────────────────────────
    console.log(`🧹 Step 1: Purging obsolete test records & sanitizing collections...`);
    
    // Remove transient test users but preserve goharhany@gmail.com and legitimate accounts
    const deletedTestUsers = await User.deleteMany({
      $or: [
        { email: { $regex: /^e2e_/i } },
        { email: { $regex: /^test_/i } },
        { email: { $regex: /^temp_/i } },
        { email: { $regex: /@example\.com$/i } },
      ]
    });
    console.log(`   🗑️  Cleaned ${deletedTestUsers.deletedCount} temporary test user accounts.`);

    // Clean test assessments & meetings
    const deletedTestAssessments = await Assessment.deleteMany({
      $or: [
        { title: { $regex: /^test/i } },
        { title: { $regex: /^temp/i } },
        { title: { $regex: /e2e/i } },
      ]
    });
    console.log(`   🗑️  Cleaned ${deletedTestAssessments.deletedCount} temporary test assessments.`);

    const deletedTestMeetings = await Meeting.deleteMany({
      $or: [
        { roomSlug: { $regex: /^temp_/i } },
        { roomSlug: { $regex: /^test_/i } },
        { title: { $regex: /^test/i } },
      ]
    });
    console.log(`   🗑️  Cleaned ${deletedTestMeetings.deletedCount} temporary test meetings.`);

    const deletedTestEvents = await Event.deleteMany({
      $or: [
        { title: { $regex: /^test/i } },
        { title: { $regex: /^temp/i } },
      ]
    });
    console.log(`   🗑️  Cleaned ${deletedTestEvents.deletedCount} temporary test calendar events.\n`);

    // ── 2. SEED ENTERPRISE USERS (ADMINS, INSTRUCTORS, STUDENTS) ─────
    console.log(`👥 Step 2: Seeding verified User Directory (Admins, Instructors & Students)...`);
    const passwordHash = await bcrypt.hash(MOCK_PASSWORD, 12);

    const USERS_DATA = [
      // Admins & Instructors
      {
        name: 'Gohar Hany',
        email: 'goharhany@gmail.com',
        role: 'admin',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
        enrolled_courses: ['rag-architectures', 'multi-agent-langgraph', 'neural-finetuning'],
        completed_lessons: ['les_rag_01', 'les_rag_02', 'les_rag_03'],
      },
      {
        name: 'Dr. Alex Sterling',
        email: 'alex.sterling@reali.ai',
        role: 'admin',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
        enrolled_courses: [],
        completed_lessons: [],
      },
      {
        name: 'Dr. Sarah Vance',
        email: 'sarah.vance@reali.ai',
        role: 'instructor',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
        enrolled_courses: [],
        completed_lessons: [],
      },
      {
        name: 'Prof. Marcus Chen',
        email: 'marcus.chen@reali.ai',
        role: 'instructor',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
        enrolled_courses: [],
        completed_lessons: [],
      },
      {
        name: 'Dr. Elena Rostova',
        email: 'elena.rostova@reali.ai',
        role: 'instructor',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80',
        enrolled_courses: [],
        completed_lessons: [],
      },

      // Real Named Students
      {
        name: 'Tariq Mansour',
        email: 'tariq.mansour@reali.ai',
        role: 'student',
        avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=256&q=80',
        enrolled_courses: ['rag-architectures', 'multi-agent-langgraph'],
        completed_lessons: ['les_rag_01', 'les_rag_02'],
      },
      {
        name: 'Nour El-Din',
        email: 'nour.eldin@reali.ai',
        role: 'student',
        avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&q=80',
        enrolled_courses: ['rag-architectures', 'neural-finetuning'],
        completed_lessons: ['les_rag_01', 'les_nft_01', 'les_nft_02'],
      },
      {
        name: 'Layla Mahmoud',
        email: 'layla.mahmoud@reali.ai',
        role: 'student',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80',
        enrolled_courses: ['multi-agent-langgraph', 'computer-vision-ai'],
        completed_lessons: ['les_mag_01', 'les_cv_01'],
      },
      {
        name: 'Karim Youssef',
        email: 'karim.youssef@reali.ai',
        role: 'student',
        avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&q=80',
        enrolled_courses: ['rag-architectures', 'ai-agents-safety'],
        completed_lessons: ['les_rag_01'],
      },
      {
        name: 'Yasmeen Adel',
        email: 'yasmeen.adel@reali.ai',
        role: 'student',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
        enrolled_courses: ['deeplearning-core', 'rag-architectures'],
        completed_lessons: ['les_dl_01', 'les_dl_02', 'les_rag_01'],
      },
    ];

    const userMap = {};
    for (const u of USERS_DATA) {
      let userDoc = await User.findOne({ email: u.email });
      if (!userDoc) {
        userDoc = await User.create({
          ...u,
          password_hash: passwordHash,
        });
        console.log(`   ✨ Created User: ${u.name} (${u.role}) -> ${u.email}`);
      } else {
        userDoc.name = u.name;
        userDoc.role = u.role;
        userDoc.avatar = u.avatar;
        userDoc.enrolled_courses = u.enrolled_courses;
        userDoc.completed_lessons = u.completed_lessons;
        userDoc.password_hash = passwordHash;
        await userDoc.save();
        console.log(`   🔄 Updated User: ${u.name} (${u.role}) -> ${u.email}`);
      }
      userMap[u.email] = userDoc;
    }

    const adminUser = userMap['goharhany@gmail.com'] || userMap['alex.sterling@reali.ai'];
    const leadInstructor = userMap['sarah.vance@reali.ai'];

    // ── 3. SEED RICH PRODUCTION COURSES ──────────────────────────────
    console.log(`\n📚 Step 3: Seeding 6 Comprehensive Production Courses & Curricula...`);

    const COURSES_DATA = [
      {
        project_id: 'rag-architectures',
        title: 'Enterprise RAG Architectures & Cognitive Vector Systems',
        subtitle: 'Build production-ready hybrid search, reranking & agentic retrieval pipelines',
        description: 'Master advanced Retrieval-Augmented Generation (RAG) paradigms. Deep dive into dense & sparse hybrid retrieval, multi-vector embeddings, ColBERT token-level scoring, contextual chunking, GraphRAG, and self-reflective agentic retrieval loops with Qdrant, Milvus, and Pinecone.',
        instructor: 'Dr. Sarah Vance',
        category: 'Artificial Intelligence',
        level: 'Advanced',
        duration: '10 weeks',
        total_hours: 42,
        lessons_count: 14,
        price: 0,
        badge: 'Enterprise Best-Seller',
        rating: 4.98,
        reviews_count: 512,
        color: '#D4AF37',
        tags: ['RAG', 'Vector Search', 'LangChain', 'Qdrant', 'GraphRAG', 'Embeddings'],
        thumbnail: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80',
        enrolled_students: [
          userMap['goharhany@gmail.com']?.id,
          userMap['tariq.mansour@reali.ai']?.id,
          userMap['nour.eldin@reali.ai']?.id,
          userMap['karim.youssef@reali.ai']?.id,
          userMap['yasmeen.adel@reali.ai']?.id,
        ].filter(Boolean),
        students_enrolled: 1840,
        modules: [
          {
            id: 'mod_rag_01',
            title: 'Module 1: Foundations of Cognitive Vector Representation & Indexing',
            lessons: [
              { id: 'les_rag_01', title: 'Dense vs Sparse Vector Embeddings (BERT to Voyage AI)', duration: '22:15', type: 'video', is_preview: true },
              { id: 'les_rag_02', title: 'HNSW, IVF-PQ & ScaNN Indexing Algorithms Decoded', duration: '28:40', type: 'video', is_preview: true },
              { id: 'les_rag_03', title: 'Contextual Semantic Chunking & Parent-Child Relationships', duration: '31:10', type: 'video', is_preview: false },
              { id: 'les_rag_04', title: 'Lab: Deploying Qdrant Cluster with Custom Ingestion Pipeline', duration: '45:00', type: 'video', is_preview: false },
            ]
          },
          {
            id: 'mod_rag_02',
            title: 'Module 2: Advanced Hybrid Search, Cross-Encoders & Re-ranking',
            lessons: [
              { id: 'les_rag_05', title: 'Reciprocal Rank Fusion (RRF) & BM25 Hybrid Synergy', duration: '26:50', type: 'video', is_preview: false },
              { id: 'les_rag_06', title: 'Cohere & BGE Cross-Encoder Re-rankers in High-Throughput Scenarios', duration: '34:20', type: 'video', is_preview: false },
              { id: 'les_rag_07', title: 'Late Interaction Models: ColBERT v2 Token Scoring at Scale', duration: '38:15', type: 'video', is_preview: false },
            ]
          },
          {
            id: 'mod_rag_03',
            title: 'Module 3: GraphRAG, Knowledge Graphs & Entity Linking',
            lessons: [
              { id: 'les_rag_08', title: 'Constructing Dynamic Knowledge Graphs from Unstructured Text', duration: '40:00', type: 'video', is_preview: false },
              { id: 'les_rag_09', title: 'Neo4j + LangChain Hybrid Vector-Graph Hybrid Queries', duration: '36:30', type: 'video', is_preview: false },
              { id: 'les_rag_10', title: 'Community Summaries & Global Context Synthesis (Microsoft GraphRAG)', duration: '42:10', type: 'video', is_preview: false },
            ]
          },
          {
            id: 'mod_rag_04',
            title: 'Module 4: Agentic Self-RAG & Corrective Retrieval (CRAG)',
            lessons: [
              { id: 'les_rag_11', title: 'Self-RAG: Reflection Tokens, Retrieval Assessment & Critique', duration: '33:45', type: 'video', is_preview: false },
              { id: 'les_rag_12', title: 'Corrective RAG (CRAG) with Automated Web Search Fallbacks', duration: '39:20', type: 'video', is_preview: false },
              { id: 'les_rag_13', title: 'Evaluation with Ragas: Faithfulness, Answer Relevance & Context Recall', duration: '48:00', type: 'video', is_preview: false },
              { id: 'les_rag_14', title: 'Capstone Project Walkthrough: Multi-Tenant Enterprise Knowledge Engine', duration: '55:00', type: 'video', is_preview: false },
            ]
          }
        ]
      },
      {
        project_id: 'multi-agent-langgraph',
        title: 'Autonomous Multi-Agent Systems with LangGraph & CrewAI',
        subtitle: 'Architect cooperative agent swarms, deterministic state machines & human-in-the-loop flows',
        description: 'Design robust multi-agent orchestration engines. Build cyclic graphs with LangGraph, hierarchical team swarms with CrewAI, dynamic tool routing, long-term memory stores, and fault-tolerant reflection mechanisms.',
        instructor: 'Dr. Elena Rostova',
        category: 'Autonomous Agents',
        level: 'Advanced',
        duration: '8 weeks',
        total_hours: 36,
        lessons_count: 10,
        price: 0,
        badge: 'Trending 🔥',
        rating: 4.95,
        reviews_count: 428,
        color: '#B8860B',
        tags: ['LangGraph', 'CrewAI', 'Multi-Agent', 'State Management', 'MCP', 'Tool Calling'],
        thumbnail: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=1200&q=80',
        enrolled_students: [
          userMap['goharhany@gmail.com']?.id,
          userMap['tariq.mansour@reali.ai']?.id,
          userMap['layla.mahmoud@reali.ai']?.id,
        ].filter(Boolean),
        students_enrolled: 1420,
        modules: [
          {
            id: 'mod_mag_01',
            title: 'Module 1: Agentic Reasoning Architectures & Function Calling',
            lessons: [
              { id: 'les_mag_01', title: 'ReAct, Plan-and-Solve & Reflection Paradigms', duration: '24:30', type: 'video', is_preview: true },
              { id: 'les_mag_02', title: 'Structured Tool Calling with JSON Schemas & Validation', duration: '27:15', type: 'video', is_preview: true },
              { id: 'les_mag_03', title: 'Model Context Protocol (MCP) Integration & Extensibility', duration: '32:40', type: 'video', is_preview: false },
            ]
          },
          {
            id: 'mod_mag_02',
            title: 'Module 2: LangGraph Core: Cyclic State Graphs & Checkpointers',
            lessons: [
              { id: 'les_mag_04', title: 'StateGraph Design, Node Handlers & Conditional Edges', duration: '35:00', type: 'video', is_preview: false },
              { id: 'les_mag_05', title: 'Persistent Checkpointers (Postgres & Redis) for State Recovery', duration: '41:10', type: 'video', is_preview: false },
              { id: 'les_mag_06', title: 'Human-in-the-Loop Approval Nodes & State Time-Travel', duration: '38:50', type: 'video', is_preview: false },
            ]
          },
          {
            id: 'mod_mag_03',
            title: 'Module 3: CrewAI Hierarchical Swarms & Production Orchestration',
            lessons: [
              { id: 'les_mag_07', title: 'Hierarchical Process with Manager LLM & Role Delegation', duration: '30:20', type: 'video', is_preview: false },
              { id: 'les_mag_08', title: 'Shared Long-Term & Short-Term Memory Synchronization', duration: '36:45', type: 'video', is_preview: false },
              { id: 'les_mag_09', title: 'Benchmarking Multi-Agent Swarm Latency & Token Efficiency', duration: '44:00', type: 'video', is_preview: false },
              { id: 'les_mag_10', title: 'Final Project: Automated Research & Financial Report Generator Swarm', duration: '52:15', type: 'video', is_preview: false },
            ]
          }
        ]
      },
      {
        project_id: 'neural-finetuning',
        title: 'LLM Fine-Tuning, LoRA & Quantization Mastery',
        subtitle: 'Domain adaptation with QLoRA, DPO, Unsloth, and vLLM high-throughput serving',
        description: 'Fine-tune open-weights models (Llama-3.3, Qwen-2.5, Mistral) on custom datasets. Master Parameter-Efficient Fine-Tuning (PEFT), Direct Preference Optimization (DPO), GGUF/AWQ quantization, and vLLM production serving.',
        instructor: 'Dr. Alex Sterling',
        category: 'Deep Learning',
        level: 'Advanced',
        duration: '9 weeks',
        total_hours: 38,
        lessons_count: 10,
        price: 0,
        badge: 'High Performance',
        rating: 4.92,
        reviews_count: 365,
        color: '#D4AF37',
        tags: ['LoRA', 'QLoRA', 'vLLM', 'DPO', 'Unsloth', 'PyTorch', 'Quantization'],
        thumbnail: 'https://images.unsplash.com/photo-1555255707-c07966088b7b?auto=format&fit=crop&w=1200&q=80',
        enrolled_students: [
          userMap['goharhany@gmail.com']?.id,
          userMap['nour.eldin@reali.ai']?.id,
        ].filter(Boolean),
        students_enrolled: 1190,
        modules: [
          {
            id: 'mod_nft_01',
            title: 'Module 1: Dataset Curation & Instruction Formatting',
            lessons: [
              { id: 'les_nft_01', title: 'Instruction vs Chat Template Formatting (ChatML, Alpaca)', duration: '21:00', type: 'video', is_preview: true },
              { id: 'les_nft_02', title: 'Data Cleaning, De-duplication & Quality Filtering with FastText', duration: '28:15', type: 'video', is_preview: false },
            ]
          },
          {
            id: 'mod_nft_02',
            title: 'Module 2: PEFT, LoRA & QLoRA Architecture',
            lessons: [
              { id: 'les_nft_03', title: 'Low-Rank Adaptation Math & Target Module Selection', duration: '34:00', type: 'video', is_preview: false },
              { id: 'les_nft_04', title: '4-Bit NormalFloat (NF4) & Double Quantization Deep Dive', duration: '31:40', type: 'video', is_preview: false },
              { id: 'les_nft_05', title: 'Fast Training with Unsloth & FlashAttention-2', duration: '46:20', type: 'video', is_preview: false },
            ]
          },
          {
            id: 'mod_nft_03',
            title: 'Module 3: Alignment with Direct Preference Optimization (DPO)',
            lessons: [
              { id: 'les_nft_06', title: 'RLHF vs DPO: Theoretical Comparison & Loss Formulations', duration: '33:10', type: 'video', is_preview: false },
              { id: 'les_nft_07', title: 'Curating Preference Pairs (Chosen vs Rejected)', duration: '29:50', type: 'video', is_preview: false },
              { id: 'les_nft_08', title: 'Running DPO Alignment with Hugging Face TRL', duration: '42:30', type: 'video', is_preview: false },
            ]
          },
          {
            id: 'mod_nft_04',
            title: 'Module 4: Quantization & High-Throughput Inference with vLLM',
            lessons: [
              { id: 'les_nft_09', title: 'AWQ, GPTQ & GGUF Quantization Pipelines', duration: '37:15', type: 'video', is_preview: false },
              { id: 'les_nft_10', title: 'Deploying vLLM with PagedAttention & Continuous Batching', duration: '50:00', type: 'video', is_preview: false },
            ]
          }
        ]
      },
      {
        project_id: 'computer-vision-ai',
        title: 'Real-Time Edge Computer Vision & Multi-Modal Models',
        subtitle: 'YOLOv11, Vision Transformers, SAM-2 segmentation & TensorRT edge deployment',
        description: 'Build production-grade computer vision systems. Train state-of-the-art YOLO detection models, segment any object with SAM-2, integrate vision-language models (CLIP, LLaVA), and optimize with NVIDIA TensorRT.',
        instructor: 'Prof. Marcus Chen',
        category: 'Computer Vision',
        level: 'Intermediate',
        duration: '8 weeks',
        total_hours: 32,
        lessons_count: 8,
        price: 0,
        badge: 'New Release',
        rating: 4.88,
        reviews_count: 290,
        color: '#D4AF37',
        tags: ['Computer Vision', 'YOLO', 'Segment Anything', 'TensorRT', 'OpenCV', 'PyTorch'],
        thumbnail: 'https://images.unsplash.com/photo-1561557944-6e7860d1a7eb?auto=format&fit=crop&w=1200&q=80',
        enrolled_students: [
          userMap['layla.mahmoud@reali.ai']?.id,
        ].filter(Boolean),
        students_enrolled: 890,
        modules: [
          {
            id: 'mod_cv_01',
            title: 'Module 1: Real-Time Object Detection with YOLOv11',
            lessons: [
              { id: 'les_cv_01', title: 'YOLO Architecture Evolution: Backbone, Neck & Head', duration: '26:00', type: 'video', is_preview: true },
              { id: 'les_cv_02', title: 'Custom Dataset Annotation & Augmentation Strategies', duration: '31:10', type: 'video', is_preview: false },
              { id: 'les_cv_03', title: 'Training & Hyperparameter Tuning on Ultralytics', duration: '40:45', type: 'video', is_preview: false },
            ]
          },
          {
            id: 'mod_cv_02',
            title: 'Module 2: Foundation Vision Models: SAM-2 & Vision Transformers (ViT)',
            lessons: [
              { id: 'les_cv_04', title: 'Vision Transformer (ViT) Patch Embeddings & Self-Attention', duration: '35:20', type: 'video', is_preview: false },
              { id: 'les_cv_05', title: 'Segment Anything Model 2 (SAM-2) for Zero-Shot Video Tracking', duration: '43:10', type: 'video', is_preview: false },
            ]
          },
          {
            id: 'mod_cv_03',
            title: 'Module 3: Edge Optimization & Production Inference',
            lessons: [
              { id: 'les_cv_06', title: 'ONNX Export & NVIDIA TensorRT FP16/INT8 Calibration', duration: '39:00', type: 'video', is_preview: false },
              { id: 'les_cv_07', title: 'Multi-Camera Stream Processing with DeepStream & RTSP', duration: '48:30', type: 'video', is_preview: false },
              { id: 'les_cv_08', title: 'Final Project: Automated Industrial Defect Detection System', duration: '54:00', type: 'video', is_preview: false },
            ]
          }
        ]
      },
      {
        project_id: 'deeplearning-core',
        title: 'Deep Learning & Transformer Foundations from Scratch',
        subtitle: 'Build tensors, backprop autograd engines & nanoGPT from first mathematical principles',
        description: 'Understand every matrix multiplication behind modern AI. Build an autograd engine (micrograd style), multi-layer perceptrons, convolutional layers, and an end-to-end Decoder-Only Transformer (nanoGPT) in raw PyTorch.',
        instructor: 'Dr. Sarah Vance',
        category: 'Foundations',
        level: 'Beginner',
        duration: '8 weeks',
        total_hours: 30,
        lessons_count: 8,
        price: 0,
        badge: 'Foundational',
        rating: 4.97,
        reviews_count: 810,
        color: '#B8860B',
        tags: ['PyTorch', 'Transformers', 'Math', 'Autograd', 'Neural Networks'],
        thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
        enrolled_students: [
          userMap['yasmeen.adel@reali.ai']?.id,
        ].filter(Boolean),
        students_enrolled: 2600,
        modules: [
          {
            id: 'mod_dl_01',
            title: 'Module 1: Computational Graphs & Automatic Differentiation',
            lessons: [
              { id: 'les_dl_01', title: 'Building an Autograd Engine with Scalar Derivatives', duration: '28:00', type: 'video', is_preview: true },
              { id: 'les_dl_02', title: 'Gradient Descent, Momentum & Adam Optimizer Deep Dive', duration: '32:15', type: 'video', is_preview: true },
            ]
          },
          {
            id: 'mod_dl_02',
            title: 'Module 2: Scaled Dot-Product & Multi-Head Self-Attention',
            lessons: [
              { id: 'les_dl_03', title: 'Query, Key, Value Projections & Attention Weights Math', duration: '36:40', type: 'video', is_preview: false },
              { id: 'les_dl_04', title: 'Causal Masking & Rotary Position Embeddings (RoPE)', duration: '41:10', type: 'video', is_preview: false },
            ]
          },
          {
            id: 'mod_dl_03',
            title: 'Module 3: Assembling & Pretraining nanoGPT',
            lessons: [
              { id: 'les_dl_05', title: 'Transformer Block Assembly: LayerNorm, MLP & Residuals', duration: '45:00', type: 'video', is_preview: false },
              { id: 'les_dl_06', title: 'Byte-Pair Encoding (BPE) Tokenizer Implementation', duration: '38:30', type: 'video', is_preview: false },
              { id: 'les_dl_07', title: 'Pretraining Loop on TinyStories & Generation Sampling', duration: '50:00', type: 'video', is_preview: false },
              { id: 'les_dl_08', title: 'Quiz & Code Review: Transformer Architecture', duration: '20:00', type: 'quiz', is_preview: false },
            ]
          }
        ]
      },
      {
        project_id: 'ai-agents-safety',
        title: 'AI Safety, Hallucination Mitigation & Production Alignment',
        subtitle: 'Guardrails, red-teaming, prompt injection defense & automated evaluation benchmarks',
        description: 'Deploy resilient AI agents in mission-critical environments. Master NeMo Guardrails, Llama-Guard content moderation, prompt injection defenses, LLM-as-a-Judge automated benchmarking, and rigorous alignment audit trails.',
        instructor: 'Dr. Alex Sterling',
        category: 'AI Safety & Security',
        level: 'Advanced',
        duration: '6 weeks',
        total_hours: 24,
        lessons_count: 6,
        price: 0,
        badge: 'Crucial Skill',
        rating: 4.91,
        reviews_count: 215,
        color: '#D4AF37',
        tags: ['AI Safety', 'Guardrails', 'Red Teaming', 'LLM Security', 'Evaluation'],
        thumbnail: 'https://images.unsplash.com/photo-1633412802994-5c058f151b66?auto=format&fit=crop&w=1200&q=80',
        enrolled_students: [
          userMap['karim.youssef@reali.ai']?.id,
        ].filter(Boolean),
        students_enrolled: 740,
        modules: [
          {
            id: 'mod_sec_01',
            title: 'Module 1: Threat Modeling & Vulnerability Taxonomy',
            lessons: [
              { id: 'les_sec_01', title: 'OWASP Top 10 for LLMs: Injection, Poisoning & Exfiltration', duration: '25:30', type: 'video', is_preview: true },
              { id: 'les_sec_02', title: 'Direct & Indirect Prompt Injection Exploitation Techniques', duration: '34:00', type: 'video', is_preview: false },
              { id: 'les_sec_03', title: 'Automated Red-Teaming with Garak & PyRIT', duration: '41:20', type: 'video', is_preview: false },
            ]
          },
          {
            id: 'mod_sec_02',
            title: 'Module 2: Production Guardrails & Continuous Moderation',
            lessons: [
              { id: 'les_sec_04', title: 'Programmable Rails with NeMo Guardrails (Colang 2.0)', duration: '38:00', type: 'video', is_preview: false },
              { id: 'les_sec_05', title: 'Self-Harm, Toxicity & PII Scrubbing with Llama-Guard', duration: '35:45', type: 'video', is_preview: false },
              { id: 'les_sec_06', title: 'Auditing LLM Outputs & Hallucination Mitigation Frameworks', duration: '49:15', type: 'video', is_preview: false },
            ]
          }
        ]
      }
    ];

    for (const c of COURSES_DATA) {
      await Course.findOneAndUpdate(
        { project_id: c.project_id },
        { $set: c },
        { upsert: true, new: true }
      );
      console.log(`   ✅ Synced Course: "${c.title}" [${c.project_id}] (${c.modules.length} modules, ${c.lessons_count} lessons)`);
    }

    // ── 4. SEED ENRICHED ASSESSMENTS ─────────────────────────────────
    console.log(`\n📝 Step 4: Seeding Quizzes, Midterms, Capstone Projects & Lab Tasks...`);

    const createdAssessments = [];

    const ASSESSMENTS_DATA = [
      // 1. RAG Quiz
      {
        title: 'Cognitive Vector Search & RAG Architecture Quiz',
        type: 'quiz',
        course_id: 'rag-architectures',
        description: 'Test your understanding of dense vs sparse embeddings, HNSW indexing, reciprocal rank fusion, and cross-encoder re-ranking.',
        instructions: 'Answer all 4 scenario-based multiple-choice questions. Passing grade is 75%.',
        status: 'published',
        time_limit: 25,
        passing_grade: 75,
        total_marks: 100,
        max_attempts: 3,
        created_by: leadInstructor?.id || adminUser?.id,
        questions: [
          {
            question: 'What is the primary advantage of Reciprocal Rank Fusion (RRF) when combining Dense and Sparse search results?',
            type: 'mcq',
            options: {
              A: 'It normalizes scores from arbitrary scales based purely on rank positions without manual weight tuning.',
              B: 'It eliminates the need for any embedding computation during indexing.',
              C: 'It restricts all vector similarities to Euclidean distance automatically.',
              D: 'It replaces cross-encoders with binary quantization.'
            },
            correct_answer: 'A',
            explanation: 'RRF computes combined scores solely from the reciprocal rank (1 / (k + rank)) across multiple retriever lists, avoiding calibration discrepancies between BM25 scores and cosine similarities.',
            marks: 25,
          },
          {
            question: 'In the HNSW (Hierarchical Navigable Small World) index graph, what role do the higher graph layers play?',
            type: 'mcq',
            options: {
              A: 'They store raw vectors in uncompressed float32 precision.',
              B: 'They act as express highways with long-range links for fast logarithmic-time skipping across the vector space.',
              C: 'They calculate exact nearest neighbors via exhaustive brute force.',
              D: 'They partition clusters using k-means centroids.'
            },
            correct_answer: 'B',
            explanation: 'Higher layers in HNSW contain sparser nodes with longer edge lengths, allowing the search to skip large distances across vector space before zooming in at lower layers.',
            marks: 25,
          },
          {
            question: 'How does ColBERT (Contextualized Late Interaction) achieve high retrieval quality while maintaining fast search speed?',
            type: 'mcq',
            options: {
              A: 'By executing full cross-encoder attention on all documents in the corpus.',
              B: 'By computing token-level contextual embeddings and calculating maximum similarity (MaxSim) via pre-indexed token centroids.',
              C: 'By reducing all documents into a single 128-dimensional dense vector.',
              D: 'By converting all queries into SQL regex patterns.'
            },
            correct_answer: 'B',
            explanation: 'ColBERT generates embeddings for each query and document token separately and computes similarity using late interaction MaxSim, enabling indexable, sub-millisecond retrieval.',
            marks: 25,
          },
          {
            question: 'In Corrective RAG (CRAG), what action is triggered when the retrieval evaluator scores document confidence as "Ambiguous" or "Low"?',
            type: 'mcq',
            options: {
              A: 'The pipeline aborts with an immediate 500 error.',
              B: 'The pipeline executes knowledge refinement and queries external web search APIs for complementary evidence.',
              C: 'The query is repeated identically 5 times in a loop.',
              D: 'The system forces the LLM to output a hallucinated response without context.'
            },
            correct_answer: 'B',
            explanation: 'CRAG evaluates retrieved document quality and, if ambiguous or irrelevant, searches the web or alternative sources to supplement or rewrite the retrieval context.',
            marks: 25,
          }
        ]
      },

      // 2. Multi-Agent Midterm Exam
      {
        title: 'Multi-Agent Swarm Architectures & State Machine Midterm',
        type: 'exam',
        course_id: 'multi-agent-langgraph',
        description: 'Comprehensive evaluation covering LangGraph state graphs, cyclic message routing, persistent checkpointers, and human-in-the-loop interruption patterns.',
        instructions: 'Time limit is 60 minutes. Make sure to review your answers before submitting.',
        status: 'published',
        time_limit: 60,
        passing_grade: 70,
        total_marks: 100,
        max_attempts: 1,
        created_by: adminUser?.id,
        questions: [
          {
            question: 'In LangGraph, how does a Node differ from an Edge?',
            type: 'mcq',
            options: {
              A: 'Nodes represent python functions that receive and mutate State, while Edges control the control-flow routing to subsequent nodes.',
              B: 'Nodes are database tables and Edges are API endpoints.',
              C: 'Nodes can only execute LLM prompts while Edges execute external Python code.',
              D: 'Nodes and Edges are identical synonyms in graph theory.'
            },
            correct_answer: 'A',
            explanation: 'Nodes are the computation units (functions/runnables) that process the current state, while Edges determine the next node based on state properties.',
            marks: 30,
          },
          {
            question: 'What is the purpose of the `interrupt_before` / `interrupt_after` configuration in LangGraph checkpointers?',
            type: 'mcq',
            options: {
              A: 'To pause graph execution and persist state to disk for human inspection, approval, or state modification before resuming.',
              B: 'To terminate the server process when an error occurs.',
              C: 'To increase the GPU memory allocation automatically.',
              D: 'To disable streaming tokens to the client.'
            },
            correct_answer: 'A',
            explanation: 'Checkpointer interrupts allow asynchronous Human-in-the-Loop workflows where state is frozen, inspected, and resumed upon user confirmation.',
            marks: 35,
          },
          {
            question: 'Which CrewAI orchestration paradigm is best suited for complex multi-step tasks requiring dynamic delegation and QA review?',
            type: 'mcq',
            options: {
              A: 'Sequential Process without roles.',
              B: 'Hierarchical Process with a designated Manager LLM coordinating specialized agents.',
              C: 'Random round-robin broadcast.',
              D: 'Unsupervised reinforcement clustering.'
            },
            correct_answer: 'B',
            explanation: 'Hierarchical Process uses a Manager Agent to analyze the overarching goal, assign subtasks to domain agents, and review output validity before final delivery.',
            marks: 35,
          }
        ]
      },

      // 3. Capstone Project Assignment
      {
        title: 'Capstone: End-to-End Hybrid RAG & Autonomous Agent Lab',
        type: 'assignment',
        course_id: 'rag-architectures',
        description: 'Architect, implement, and deploy an end-to-end production RAG system incorporating hybrid search (BM25 + Qdrant dense vectors), BGE re-ranking, and LangGraph self-reflection evaluator.',
        instructions: 'Submit your GitHub repository link and a 2-page architectural design PDF. Ensure your codebase includes automated tests and Docker Compose deployment instructions.',
        status: 'published',
        time_limit: 0,
        passing_grade: 80,
        total_marks: 100,
        max_attempts: 2,
        created_by: leadInstructor?.id || adminUser?.id,
        questions: []
      },

      // 4. Hands-on Lab Task
      {
        title: 'Hands-on Lab: Quantized Model Serving with vLLM & PagedAttention',
        type: 'task',
        course_id: 'neural-finetuning',
        description: 'Configure an optimized inference container running Qwen-2.5-7B-Instruct with AWQ 4-bit quantization, prefix caching, and continuous batching.',
        instructions: 'Execute the benchmarking script against concurrent requests and upload your throughput/latency metrics output JSON.',
        status: 'published',
        time_limit: 120,
        passing_grade: 75,
        total_marks: 100,
        max_attempts: 3,
        created_by: adminUser?.id,
        questions: []
      }
    ];

    for (const a of ASSESSMENTS_DATA) {
      let doc = await Assessment.findOne({ title: a.title, course_id: a.course_id });
      if (!doc) {
        doc = await Assessment.create(a);
        console.log(`   ✨ Created Assessment: "${a.title}" [${a.type.toUpperCase()}]`);
      } else {
        Object.assign(doc, a);
        await doc.save();
        console.log(`   🔄 Updated Assessment: "${a.title}" [${a.type.toUpperCase()}]`);
      }
      createdAssessments.push(doc);
    }

    // ── 5. SEED GRADED STUDENT SUBMISSIONS & RUBRICS ──────────────────
    console.log(`\n🏆 Step 5: Seeding Realistic Student Submissions & Instructor Feedback...`);

    const ragQuiz = createdAssessments.find(a => a.title.includes('Cognitive Vector Search'));
    const agentMidterm = createdAssessments.find(a => a.title.includes('Multi-Agent Swarm'));
    const capstoneProject = createdAssessments.find(a => a.title.includes('Capstone: End-to-End'));

    const SUBMISSIONS_DATA = [
      // Student 1 (Gohar Hany) - 100% Quiz
      ragQuiz && {
        assessment_id: ragQuiz._id,
        student_id: userMap['goharhany@gmail.com']?.id,
        student_name: 'Gohar Hany',
        student_email: 'goharhany@gmail.com',
        answers: { '0': 'A', '1': 'B', '2': 'B', '3': 'B' },
        score: 100,
        total_marks: 100,
        percentage: 100,
        time_taken: 540,
        status: 'graded',
        feedback: 'Outstanding mastery of hybrid retrieval mathematics and ColBERT MaxSim scoring.',
        graded_by: leadInstructor?.id || adminUser?.id,
      },
      // Student 2 (Tariq Mansour) - 75% Quiz
      ragQuiz && {
        assessment_id: ragQuiz._id,
        student_id: userMap['tariq.mansour@reali.ai']?.id,
        student_name: 'Tariq Mansour',
        student_email: 'tariq.mansour@reali.ai',
        answers: { '0': 'A', '1': 'B', '2': 'A', '3': 'B' },
        score: 75,
        total_marks: 100,
        percentage: 75,
        time_taken: 820,
        status: 'graded',
        feedback: 'Great performance! Review ColBERT token-level late interaction architecture for question 3.',
        graded_by: leadInstructor?.id || adminUser?.id,
      },
      // Student 3 (Nour El-Din) - Midterm 95%
      agentMidterm && {
        assessment_id: agentMidterm._id,
        student_id: userMap['nour.eldin@reali.ai']?.id,
        student_name: 'Nour El-Din',
        student_email: 'nour.eldin@reali.ai',
        answers: { '0': 'A', '1': 'A', '2': 'B' },
        score: 100,
        total_marks: 100,
        percentage: 100,
        time_taken: 1650,
        status: 'graded',
        feedback: 'Flawless comprehension of LangGraph checkpointer architecture and human-in-the-loop nodes.',
        graded_by: adminUser?.id,
      },
      // Student 1 (Gohar Hany) - Capstone Project Graded 96%
      capstoneProject && {
        assessment_id: capstoneProject._id,
        student_id: userMap['goharhany@gmail.com']?.id,
        student_name: 'Gohar Hany',
        student_email: 'goharhany@gmail.com',
        answers: {
          repoUrl: 'https://github.com/Gohar-Hany/production-rag-engine',
          liveDemo: 'https://rag-demo.reali.ai',
          notes: 'Full implementation of hybrid search with ColBERT reranking, Qdrant cluster, and LangGraph fallback evaluation.'
        },
        files: [
          { name: 'architecture_design_spec.pdf', size: '2.4 MB', url: 'https://reali.ai/docs/rag_spec.pdf' }
        ],
        score: 96,
        total_marks: 100,
        percentage: 96,
        time_taken: 7200,
        status: 'graded',
        feedback: 'Exceptional production architecture. The Docker Compose cluster and latency benchmarks exceeded all criteria.',
        graded_by: leadInstructor?.id || adminUser?.id,
      }
    ].filter(Boolean);

    for (const sub of SUBMISSIONS_DATA) {
      await Submission.findOneAndUpdate(
        { assessment_id: sub.assessment_id, student_id: sub.student_id },
        { $set: sub },
        { upsert: true, new: true }
      );
      console.log(`   🏅 Synced Submission: ${sub.student_name} on Assessment -> Score: ${sub.score}%`);
    }

    // ── 6. SEED LIVE MEETINGS & RECURRING WORKSHOPS ───────────────────
    console.log(`\n🎙️ Step 6: Seeding Live Classrooms, AI Summaries, Polls & Attendance...`);

    const now = new Date();
    const todayEvening = new Date(now);
    todayEvening.setHours(19, 0, 0, 0);

    const tomorrowEvening = new Date(now);
    tomorrowEvening.setDate(tomorrowEvening.getDate() + 1);
    tomorrowEvening.setHours(18, 30, 0, 0);

    const pastSessionDate = new Date(now);
    pastSessionDate.setDate(pastSessionDate.getDate() - 2);
    pastSessionDate.setHours(17, 0, 0, 0);

    const MEETINGS_DATA = [
      // 1. Live Meeting (Scheduled for Today)
      {
        roomName: 'RAG Architecture Masterclass #4',
        roomSlug: 'rag_masterclass_04',
        title: 'Building Enterprise GraphRAG & Hybrid Search Engines',
        description: 'Interactive live session covering dense-sparse fusion, Qdrant indexing benchmarks, and hands-on Neo4j entity resolution.',
        expectedDurationMinutes: 75,
        instructorId: leadInstructor?.id || adminUser?.id,
        courseId: 'rag-architectures',
        courseName: 'Enterprise RAG Architectures & Cognitive Vector Systems',
        targetCohorts: ['2026-Cohort-Alpha', '2026-Cohort-Beta'],
        status: 'scheduled',
        scheduledFor: todayEvening,
        lobbyEnabled: false,
        security: {
          muteOnEntry: true,
          requireHostToStart: false,
          disableStudentScreenShare: true,
          disableStudentCamera: false,
        },
        polls: [
          {
            pollId: 'poll_seed_01',
            question: 'Which vector database index type do you currently deploy in production?',
            options: [
              { optionId: 'opt_1', text: 'HNSW (Hierarchical Navigable Small World)', votes: 8 },
              { optionId: 'opt_2', text: 'IVF-PQ (Inverted File Product Quantization)', votes: 3 },
              { optionId: 'opt_3', text: 'ScaNN (Anisotropic Vector Quantization)', votes: 2 },
              { optionId: 'opt_4', text: 'Flat / Exact Brute Force', votes: 1 },
            ],
            active: true,
            timerSeconds: 60,
            responses: [
              { userId: userMap['tariq.mansour@reali.ai']?.id, userName: 'Tariq Mansour', optionId: 'opt_1' },
              { userId: userMap['nour.eldin@reali.ai']?.id, userName: 'Nour El-Din', optionId: 'opt_1' },
            ]
          }
        ]
      },

      // 2. Completed Past Session with AI Summary & Transcript
      {
        roomName: 'Multi-Agent Systems Workshop #2',
        roomSlug: 'multiagent_workshop_02',
        title: 'LangGraph State Machines & Human-in-the-Loop Orchestration',
        description: 'Recorded live deep-dive into cyclic state graphs, Postgres checkpointers, and real-time reflection swarms.',
        expectedDurationMinutes: 90,
        instructorId: adminUser?.id,
        courseId: 'multi-agent-langgraph',
        courseName: 'Autonomous Multi-Agent Systems with LangGraph & CrewAI',
        targetCohorts: ['2026-Cohort-Alpha'],
        status: 'ended',
        scheduledFor: pastSessionDate,
        startTime: pastSessionDate,
        endTime: new Date(pastSessionDate.getTime() + 90 * 60000),
        recordingUrl: 'https://reali.ai/recordings/multiagent_workshop_02.mp4',
        attendance: [
          {
            participantId: userMap['goharhany@gmail.com']?.id,
            name: 'Gohar Hany',
            email: 'goharhany@gmail.com',
            role: 'student',
            durationSeconds: 5400,
            attendancePercentage: 100,
            status: 'present'
          },
          {
            participantId: userMap['tariq.mansour@reali.ai']?.id,
            name: 'Tariq Mansour',
            email: 'tariq.mansour@reali.ai',
            role: 'student',
            durationSeconds: 5100,
            attendancePercentage: 94,
            status: 'present'
          },
          {
            participantId: userMap['layla.mahmoud@reali.ai']?.id,
            name: 'Layla Mahmoud',
            email: 'layla.mahmoud@reali.ai',
            role: 'student',
            durationSeconds: 4800,
            attendancePercentage: 89,
            status: 'present'
          }
        ],
        aiSummary: {
          summary: 'In this high-intensity workshop, Dr. Elena Rostova and the cohort dissected LangGraph cyclic graphs, implementing state channels with reducers, Postgres persistent checkpointer recovery, and human approval nodes.',
          keyTakeaways: [
            'StateGraph channels require explicit reducer functions (e.g. operator.add) to handle append-only message histories without overwriting.',
            'Postgres checkpointers enable zero-loss state recovery across distributed worker restarts.',
            'Human-in-the-loop interrupt nodes pause the execution thread and expose state inspection APIs before resume triggers.'
          ],
          actionItems: [
            'Implement a 3-agent research team using CrewAI and benchmark token costs vs LangGraph.',
            'Submit Capstone Architecture spec by Sunday midnight.',
            'Review ColBERT v2 token scoring lecture notes.'
          ],
          generatedQuiz: [
            {
              question: 'Why are reducers necessary in LangGraph StateGraph schemas?',
              options: [
                'To specify how updates from parallel nodes should be merged into state attributes.',
                'To compress audio streams into MP3 format.',
                'To convert python classes into JSON strings.'
              ],
              correctIndex: 0
            }
          ],
          generatedAt: new Date(pastSessionDate.getTime() + 95 * 60000)
        }
      },

      // 3. Upcoming Fine-Tuning Session Tomorrow
      {
        roomName: 'LLM Fine-Tuning Lab #1',
        roomSlug: 'finetuning_lab_01',
        title: 'QLoRA Math & Unsloth GPU Acceleration Hands-on',
        description: 'Live interactive coding session fine-tuning Llama-3.3-70B on 4x A100 GPUs.',
        expectedDurationMinutes: 60,
        instructorId: adminUser?.id,
        courseId: 'neural-finetuning',
        courseName: 'LLM Fine-Tuning, LoRA & Quantization Mastery',
        targetCohorts: ['2026-Cohort-Alpha'],
        status: 'scheduled',
        scheduledFor: tomorrowEvening,
        lobbyEnabled: true,
      }
    ];

    for (const m of MEETINGS_DATA) {
      await Meeting.findOneAndUpdate(
        { roomSlug: m.roomSlug },
        { $set: m },
        { upsert: true, new: true }
      );
      console.log(`   🎥 Synced Meeting: "${m.title}" [${m.status.toUpperCase()}] -> roomSlug: ${m.roomSlug}`);
    }

    // ── 7. SEED CALENDAR EVENTS & MILESTONES ───────────────────────────
    console.log(`\n📅 Step 7: Seeding Consolidated Academic Calendar Events & Milestones...`);

    const EVENTS_DATA = [
      {
        title: '🔴 Live Masterclass: Enterprise GraphRAG & Hybrid Search',
        description: 'Live interactive session with Dr. Sarah Vance. Qdrant & Neo4j deployment lab.',
        date: todayEvening,
        time: '19:00 - 20:15 UTC',
        type: 'meeting',
        course_id: 'rag-architectures',
        color: '#D4AF37',
        created_by: adminUser?.id,
      },
      {
        title: '⚡ QLoRA Fine-Tuning & Unsloth Lab',
        description: 'Hands-on GPU cluster workshop fine-tuning open-weights models.',
        date: tomorrowEvening,
        time: '18:30 - 19:30 UTC',
        type: 'workshop',
        course_id: 'neural-finetuning',
        color: '#38BDF8',
        created_by: adminUser?.id,
      },
      {
        title: '📌 Capstone Project Architecture Submission Deadline',
        description: 'Submit your GitHub repo link and architectural specification document.',
        date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        time: '23:59 UTC',
        type: 'deadline',
        course_id: 'rag-architectures',
        color: '#EF4444',
        created_by: adminUser?.id,
      },
      {
        title: '🎓 Multi-Agent Swarms Midterm Exam Window',
        description: 'Online timed examination covering LangGraph state machines and agent routing.',
        date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        time: '09:00 - 21:00 UTC',
        type: 'exam',
        course_id: 'multi-agent-langgraph',
        color: '#A855F7',
        created_by: adminUser?.id,
      }
    ];

    for (const ev of EVENTS_DATA) {
      await Event.findOneAndUpdate(
        { title: ev.title },
        { $set: ev },
        { upsert: true, new: true }
      );
      console.log(`   🗓️  Synced Calendar Event: "${ev.title}"`);
    }

    console.log(`\n======================================================================`);
    console.log(`✨ ENTERPRISE DATABASE SEEDING & SANITIZATION COMPLETED SUCCESSFULLY!`);
    console.log(`======================================================================\n`);
    console.log(`📊 SEEDED SUMMARY:`);
    console.log(`   - 👤 Users: ${USERS_DATA.length} (Admins, Instructors, Named Students)`);
    console.log(`   - 📚 Courses: ${COURSES_DATA.length} (60+ detailed modules & lessons)`);
    console.log(`   - 📝 Assessments: ${ASSESSMENTS_DATA.length} (Quizzes, Midterms, Capstones, Labs)`);
    console.log(`   - 🏆 Submissions: ${SUBMISSIONS_DATA.length} (Auto & manual graded with feedback)`);
    console.log(`   - 🎥 Meetings: ${MEETINGS_DATA.length} (Live classrooms, AI summaries, polls)`);
    console.log(`   - 🗓️  Events: ${EVENTS_DATA.length} (Consolidated academic calendar)`);
    console.log(`\n🔑 Primary Accounts:`);
    console.log(`   • Admin:      goharhany@gmail.com   (Pass: ${MOCK_PASSWORD})`);
    console.log(`   • Instructor: sarah.vance@reali.ai  (Pass: ${MOCK_PASSWORD})`);
    console.log(`   • Student:    tariq.mansour@reali.ai (Pass: ${MOCK_PASSWORD})`);
    console.log(`\n`);

    process.exit(0);
  } catch (err) {
    console.error(`❌ Seeding failed with error:`, err);
    process.exit(1);
  }
}

seedEnterpriseData();
