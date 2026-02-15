
# DeepTrust – System Design Document

---

## 1. System Architecture

DeepTrust follows a client-server architecture.

Components:
- Frontend (Web Interface)
- Backend API Server
- AI Model Service
- Optional Logging Database

---

## 2. Architecture Diagram (Logical)

User
  ↓
Frontend (React / HTML)
  ↓
Backend API (Node.js / Python)
  ↓
AI Model (CNN Classifier)
  ↓
Prediction Result
  ↓
Frontend Display

---

## 3. Frontend Design

Responsibilities:
- Image upload (JPG, PNG)
- File validation
- Display prediction result
- Show confidence score

Technology:
- HTML, CSS, JavaScript
- React (if used)

---

## 4. Backend Design

Responsibilities:
- Accept image via REST API
- Validate file type and size
- Preprocess image
- Call AI model
- Return JSON response

Example Endpoint:
POST /api/predict

Response:
{
  "prediction": "AI Generated",
  "confidence": 0.87
}

---

## 5. AI Model Design

Model Type:
- Convolutional Neural Network (CNN)

Processing Steps:
1. Resize image (e.g., 224x224)
2. Normalize pixel values
3. Pass through trained model
4. Output probability score

Threshold:
- If confidence > 0.5 → AI Generated
- Else → Real

---

## 6. Deployment Design

Frontend:
- Hosted on Vercel

Backend:
- Cloud server or API hosting platform

Model:
- Integrated within backend service

---

## 7. Security Considerations

- Limit file size (e.g., 5MB)
- Accept only safe formats
- Do not store user images permanently
- Prevent malicious uploads

---

## 8. Scalability Plan

- Use stateless backend
- Deploy model on scalable cloud infrastructure
- Add caching if required
