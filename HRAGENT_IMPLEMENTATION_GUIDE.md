# HRAgent Implementation Guide - Based on Placify Analysis

## Executive Summary

This document provides a condensed implementation roadmap for building an HRAgent with similar capabilities to Placify's ML modules. The analysis identifies 5 key algorithms to implement.

---

## Key Components to Implement

### 1. Resume-to-JD Matching Engine ⭐ CRITICAL

**Algorithm**: Semantic Similarity via SentenceTransformer  
**Complexity**: Simple (leverages pre-trained model)  
**Performance**: < 100ms per match

**Implementation Steps**:

```python
# Step 1: Extract resume data
resume_text = f"""
{resume.summary}
Skills: {', '.join(resume.skills)}
Experience: {combine_work_experience(resume.workExperience)}
Projects: {combine_projects(resume.projects)}
"""

# Step 2: Extract job requirements
job_text = f"""
{job.title} - {job.domain}
{job.description}
Requirements: {', '.join(job.requirements)}
Responsibilities: {', '.join(job.responsibilities)}
"""

# Step 3: Vectorize
from sentence_transformers import SentenceTransformer, util
model = SentenceTransformer('all-MiniLM-L6-v2')
resume_emb = model.encode(resume_text, convert_to_tensor=True)
job_emb = model.encode(job_text, convert_to_tensor=True)

# Step 4: Score
similarity = util.pytorch_cos_sim(resume_emb, job_emb).item()
match_score = int(similarity * 100)

return {
    "matchScore": match_score,
    "missingSkills": list(set(job.requirements) - set(resume.skills)),
    "feedback": f"Match: {match_score}%"
}
```

**Critical Configuration**:

- Model: `all-MiniLM-L6-v2` (384-dimensional, lightweight)
- Metric: Cosine similarity
- Range: 0-100%
- Typical Match Time: 50-100ms for single pair

**Why This Works**:

- Pre-trained on NLI + STS tasks
- Captures semantic meaning, not just keywords
- Fast inference with distilled model
- No training required

---

### 2. Skill Gap Analysis ⭐ ESSENTIAL

**Algorithm**: Set Difference Operations  
**Complexity**: Trivial (set math)  
**Performance**: < 1ms

**Implementation**:

```python
def calculate_skill_gap(current_role_skills, target_role_skills, student_skills):
    """
    Find skills student needs to acquire
    """
    # Normalize to lowercase
    current = {s.lower() for s in current_role_skills}
    target = {s.lower() for s in target_role_skills}
    student = {s.lower() for s in student_skills}

    # Find gaps
    missing_from_current = current - student
    missing_from_target = target - student

    # Return union (must learn both foundations and target skills)
    gap = missing_from_current.union(missing_from_target)
    return sorted(list(gap))

# Usage
gaps = calculate_skill_gap(
    {"Python", "Git", "Django"},      # What junior backend needs
    {"Docker", "Kubernetes", ...},    # What senior backend needs
    {"Python", "Git"}                 # What student has
)
# Returns: ["Django", "Docker", "Kubernetes", ...]
```

**Why This Works**:

- Precise gap identification
- No false positives/negatives
- Instant computation
- Easy to understand and explain to users

---

### 3. Career Path Graph Navigation ⭐ IMPORTANT

**Algorithm**: Graph-based BFS with Similarity Matching  
**Complexity**: Moderate (graph operations + vectorization)  
**Performance**: < 500ms for small graph

**Implementation**:

```python
import networkx as nx
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

class CareerPathEngine:
    def __init__(self):
        # Build graph
        self.graph = nx.DiGraph()
        self._build_role_graph()

    def _build_role_graph(self):
        """
        Define roles and transitions
        Nodes: {"Junior Backend": {"skills": {...}}}
        Edges: ("Junior Backend" → "Senior Backend")
        """
        roles = {
            "Graduate": {"Python", "Data Structures"},
            "Junior Backend": {"Python", "Django", "SQL", "REST APIs"},
            "Senior Backend": {"Python", "Django", "Docker", "Kubernetes"},
            "Tech Lead": {"All above", "System Design", "Team Leadership"}
        }

        # Add nodes
        for role, skills in roles.items():
            self.graph.add_node(role, skills=skills)

        # Add edges (transitions)
        self.graph.add_edges_from([
            ("Graduate", "Junior Backend"),
            ("Junior Backend", "Senior Backend"),
            ("Senior Backend", "Tech Lead")
        ])

    def find_best_path(self, student_profile):
        """
        Find optimal career path
        """
        vectorizer = SentenceTransformer('all-MiniLM-L6-v2')

        # 1. Find closest starting role
        student_vector = vectorizer.encode(
            f"Skills: {' '.join(student_profile['skills'])}"
        )

        best_match = None
        best_score = -1

        for role in self.graph.nodes():
            role_skills = self.graph.nodes[role]['skills']
            role_vector = vectorizer.encode(f"Skills: {' '.join(role_skills)}")

            score = cosine_similarity(
                student_vector.reshape(1, -1),
                role_vector.reshape(1, -1)
            )[0][0]

            if score > best_score:
                best_score = score
                best_match = role

        # 2. Find successors (next roles)
        current_role = best_match
        next_roles = list(self.graph.successors(current_role))

        # 3. Calculate gaps for each
        results = []
        for target_role in next_roles:
            current_skills = self.graph.nodes[current_role]['skills']
            target_skills = self.graph.nodes[target_role]['skills']
            student_skills = set(student_profile['skills'])

            gap = calculate_skill_gap(
                current_skills,
                target_skills,
                student_skills
            )

            results.append({
                "current": current_role,
                "target": target_role,
                "gap": gap,
                "gap_size": len(gap)  # Use for ranking
            })

        # Sort by gap size (easiest paths first)
        results.sort(key=lambda x: x['gap_size'])
        return results
```

**Why This Works**:

- Pre-defined roles avoid ML training
- Graph structure naturally models career transitions
- Vectorization finds best starting point
- Scalable to hundreds of roles

---

### 4. LLM-Based Recommendations ⭐ NICE-TO-HAVE

**Algorithm**: Prompt Engineering + LLM Generation  
**Complexity**: Simple (API call)  
**Performance**: 2-5 seconds

**Implementation**:

```python
import google.generativeai as genai

class RecommendationEngine:
    def __init__(self, api_key):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('models/gemini-1.5-pro')

    def generate_learning_plan(self, target_role, skill_gaps):
        """
        Generate personalized learning recommendations
        """
        prompt = f"""
        Act as a career coach for a software engineer.

        Target Role: {target_role}
        Missing Skills: {', '.join(skill_gaps)}

        Provide a concise 3-part recommendation:

        1. **Why**: 2-3 sentences on why these skills matter
        2. **How**: 1-2 project ideas to learn these skills
        3. **Where**: 1-2 resources to learn from

        Format as markdown.
        """

        response = self.model.generate_content(prompt)
        return response.text

    # Usage
    engine = RecommendationEngine(api_key="your_key")
    plan = engine.generate_learning_plan(
        target_role="Senior Backend Developer",
        skill_gaps=["Docker", "Kubernetes"]
    )
    print(plan)
```

**Why This Works**:

- No training required
- Generates contextual, personalized advice
- Multiple response possibilities keep it fresh
- Easy to integrate

**Cost Note**: ~$0.001-0.01 per call at Gemini Pro pricing

---

### 5. Match Score Calculation (Hybrid Approach)

**Algorithm**: Weighted Scoring (Semantic + Skill-based)  
**Complexity**: Simple
**Performance**: < 100ms

**Recommended Formula**:

```python
def calculate_match_score(resume, job_posting):
    """
    Hybrid scoring: 70% semantic + 30% skill-based
    """

    # 1. SEMANTIC SIMILARITY (70% weight)
    # Using SentenceTransformer cosine similarity
    model = SentenceTransformer('all-MiniLM-L6-v2')

    resume_text = extract_resume_text(resume)
    job_text = extract_job_text(job_posting)

    resume_emb = model.encode(resume_text, convert_to_tensor=True)
    job_emb = model.encode(job_text, convert_to_tensor=True)

    semantic_similarity = util.pytorch_cos_sim(resume_emb, job_emb).item()

    # 2. SKILL-BASED MATCH (30% weight)
    # Direct skill overlap
    resume_skills = set(s.lower() for s in resume.get('skills', []))
    required_skills = set(s.lower() for s in job_posting.get('requirements', []))

    if len(required_skills) == 0:
        skill_match = 1.0
    else:
        skill_match = len(resume_skills & required_skills) / len(required_skills)

    # 3. COMBINE SCORES
    final_score = (0.7 * semantic_similarity + 0.3 * skill_match) * 100

    return int(final_score)

# Example outputs
calculate_match_score(resume, job)  # Returns: 78
```

**Why This Weighting**:

- **70% Semantic**: Captures context, experience level, communication style
- **30% Skill**: Ensures exact skill requirements are met
- Avoids over-reliance on keyword matching
- Handles skill name variations (Python, python, PYTHON)

---

## Complete Integration for HRAgent

### Architecture

```
┌─────────────────────────────────────────────────────┐
│               HRAgent Core Services                  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────┐      ┌─────────────────────┐ │
│  │  Resume Analysis │      │  Job Description    │ │
│  │      Module      │      │   Analysis Module   │ │
│  └────────┬─────────┘      └──────────┬──────────┘ │
│           │                          │              │
│           └──────────┬───────────────┘              │
│                      ▼                              │
│        ┌─────────────────────────────┐             │
│        │ Semantic Embeddings         │             │
│        │ (SentenceTransformer)       │             │
│        └──────────┬──────────────────┘             │
│                   ▼                                 │
│        ┌─────────────────────────────┐             │
│        │ Match Score Calculator      │             │
│        │ (Semantic + Skill-based)    │             │
│        └──────────┬──────────────────┘             │
│                   ▼                                 │
│        ┌─────────────────────────────┐             │
│        │ Skill Gap Analyzer          │             │
│        │ (Set Operations)            │             │
│        └──────────┬──────────────────┘             │
│                   ▼                                 │
│        ┌─────────────────────────────┐             │
│        │ Career Path Recommender     │             │
│        │ (Graph Navigation)          │             │
│        └──────────┬──────────────────┘             │
│                   ▼                                 │
│        ┌─────────────────────────────┐             │
│        │ Learning Plan Generator     │             │
│        │ (LLM Integration)           │             │
│        └─────────────────────────────┘             │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Deployment Checklist

- [ ] **Dependencies Installed**

  ```bash
  pip install sentence-transformers torch networkx google-generativeai scikit-learn
  ```

- [ ] **Models Downloaded**

  ```python
  from sentence_transformers import SentenceTransformer
  model = SentenceTransformer('all-MiniLM-L6-v2')  # ~60MB
  ```

- [ ] **API Keys Configured**

  ```bash
  export GEMINI_API_KEY="your_key"
  ```

- [ ] **Career Graph Built**

  ```python
  from app.engines import CareerPathEngine
  engine = CareerPathEngine()  # Initializes graph
  ```

- [ ] **Endpoints Created**
  ```python
  POST /api/match-resume-job
  POST /api/analyze-skill-gap
  POST /api/recommend-career-path
  POST /api/generate-learning-plan
  ```

---

## Optimization Strategies

### Speed Optimization

```python
# 1. Cache role vectors (career path engine)
role_vectors = {}
for role in career_graph.nodes():
    skills = career_graph.nodes[role]['skills']
    vector = vectorizer.encode(f"Skills: {' '.join(skills)}")
    role_vectors[role] = vector
# Now lookup is O(1) instead of re-encoding

# 2. Batch vectorization for multiple resumes
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('all-MiniLM-L6-v2')
embeddings = model.encode([text1, text2, text3])  # Batch is faster

# 3. Filter before LLM calls (expensive)
# Only call LLM for top 100 candidates, not all 1000
```

### Accuracy Optimization

```python
# 1. Fine-tuned model (optional)
# Replace 'all-MiniLM-L6-v2' with domain-specific model
# Requires: 500+ pairs of (resume, job_description) with similarity scores

# 2. Skill synonym mapping
skill_aliases = {
    "js": "javascript",
    "ts": "typescript",
    "k8s": "kubernetes",
    "ml": "machine learning"
}

def normalize_skill(skill):
    return skill_aliases.get(skill.lower(), skill.lower())

# 3. Experience weighting
# Consider years of experience when scoring
def weighted_skill_match(resume_skills, job_skills):
    exact_matches = sum(1 for skill in job_skills if skill in resume_skills)
    return (exact_matches / len(job_skills)) * 100

# 4. Expand career graph
# Add more roles, transitions, and skill requirements
# Current: 10 roles; Ideal: 50-100 roles
```

---

## Database Schema for Persistent Storage

```sql
-- Core tables
CREATE TABLE resumes (
    id UUID PRIMARY KEY,
    candidate_id UUID,
    content TEXT,
    skills JSONB,
    vectorized BOOLEAN,
    embedding VECTOR(384),  -- pgvector extension
    created_at TIMESTAMP
);

CREATE TABLE job_descriptions (
    id UUID PRIMARY KEY,
    title VARCHAR(255),
    requirements JSONB,
    responsibilities JSONB,
    embedding VECTOR(384),
    created_at TIMESTAMP
);

CREATE TABLE matches (
    id UUID PRIMARY KEY,
    resume_id UUID REFERENCES resumes(id),
    job_id UUID REFERENCES job_descriptions(id),
    match_score INT,
    skill_gaps JSONB,
    semantic_similarity FLOAT,
    skill_match FLOAT,
    created_at TIMESTAMP
);

CREATE TABLE career_paths (
    id UUID PRIMARY KEY,
    candidate_id UUID,
    current_role VARCHAR(255),
    target_role VARCHAR(255),
    skill_gap JSONB,
    recommendation TEXT,
    created_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_resume_skills ON resumes USING GIN(skills);
CREATE INDEX idx_job_requirements ON job_descriptions USING GIN(requirements);
CREATE INDEX idx_match_scores ON matches(match_score DESC);
```

---

## Testing Strategy

```python
# Unit tests for each component
def test_skill_gap_analyzer():
    gap = calculate_skill_gap(
        {"Python", "Git"},
        {"Python", "Docker", "Kubernetes"},
        {"Python"}
    )
    assert gap == {"Docker", "Git", "Kubernetes"}

def test_semantic_matching():
    score = calculate_match_score(
        resume=mock_resume_similar(),
        job_posting=mock_job_similar()
    )
    assert score > 70  # Should be high for similar content

# Integration tests
def test_full_matching_pipeline():
    engine = MatchingEngine()
    result = engine.analyze_fit(
        resume=sample_resume,
        job=sample_job
    )
    assert 'matchScore' in result
    assert 'skillGaps' in result
```

---

## Monitoring & Metrics

```python
# Key metrics to track
metrics = {
    "avg_match_score": 75,              # Should be 50-80 typically
    "processing_time_ms": 120,          # Should be < 200ms
    "lmm_call_success_rate": 0.95,      # Should be > 0.9
    "unique_skills_identified": 5000,   # Growing corpus
    "top_skill_gaps": [                 # Most common missing skills
        ("Docker", 45),
        ("Kubernetes", 38),
        ("AWS", 32)
    ]
}
```

---

## Success Metrics

- **Match Score Accuracy**: Correlation with recruiter feedback > 0.75
- **Processing Speed**: < 100ms per resume-job pair
- **Skill Gap Completeness**: < 5% user-reported missing gaps
- **LLM Recommendation Quality**: > 80% users find recommendations useful
- **Career Path Adoption**: > 30% users follow recommended learning plans

---

## Next Steps for Your HRAgent

1. **Phase 1** (Week 1-2): Implement resume-to-JD matching
   - Deploy SentenceTransformer
   - Create scoring API endpoint
   - Test with 100 resume-job pairs

2. **Phase 2** (Week 2-3): Add skill gap analysis
   - Implement set operations
   - Create skill database
   - Integrate with matching

3. **Phase 3** (Week 3-4): Build career path engine
   - Create role graph
   - Implement path finding
   - Add vectorization

4. **Phase 4** (Week 4-5): Add LLM recommendations
   - Integrate Gemini API
   - Build prompt templates
   - Test recommendations

5. **Phase 5** (Week 5-6): Optimize and deploy
   - Performance tuning
   - Caching implementation
   - Production deployment

---

## References & Resources

- **Placify Repository**: https://github.com/MonishRaman/Placify-Smarter_Placements-Sharper_Talent
- **SentenceTransformer**: https://www.sbert.net/
- **NetworkX Documentation**: https://networkx.org/
- **Scikit-learn Metrics**: https://scikit-learn.org/stable/modules/generated/sklearn.metrics.pairwise.cosine_similarity.html
- **Google Gemini API**: https://ai.google.dev/

---

_Implementation Guide Version: 1.0_  
_Estimated Development Time: 3-5 weeks_  
_Recommended Team Size: 1-2 engineers_
