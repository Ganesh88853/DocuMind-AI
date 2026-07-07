# DocuMind AI — User Guide

> Welcome to DocuMind AI — your AI-powered document assistant.

---

## Getting Started

### Creating Your Account

1. Navigate to the DocuMind AI website
2. Click **Get Started** or **Sign Up**
3. Fill in your name, email, and a strong password
   - Password must be at least 8 characters
   - Must include at least one uppercase letter and one number
4. Click **Create Account**
5. You will be automatically logged in and taken to your Dashboard

### Logging In

1. Click **Login** on the homepage
2. Enter your registered email and password
3. Click **Sign In**

If you forget your password, click **Forgot Password** and enter your email to receive reset instructions.

---

## Dashboard

The Dashboard is your central hub showing:

- **Recent Documents** — your last uploaded files with processing status
- **Quick Stats** — total documents, searches performed, AI conversations
- **Recent Activity** — your latest interactions with the system
- **Quick Upload** — drag-and-drop area for fast document uploading

---

## Uploading Documents

### Supported File Types

| Type | Extensions | Max Size |
|---|---|---|
| PDF | `.pdf` | 50MB |
| Word | `.docx` | 50MB |
| Images | `.png`, `.jpg`, `.jpeg`, `.gif`, `.bmp`, `.tiff` | 50MB |

### How to Upload

1. Click **Upload** in the sidebar or navigation bar
2. Drag and drop your file onto the upload area, OR click **Browse Files**
3. Optionally add a title and description
4. Click **Upload Document**

### Document Processing

After upload, your document goes through several processing stages:

| Status | Meaning |
|---|---|
| 🟡 **Processing** | Document is being read and analyzed |
| ✅ **Ready** | Processing complete — document is searchable |
| ❌ **Error** | Processing failed — see the error message |

Processing typically takes **5–30 seconds** depending on document size and complexity. The page will automatically refresh when processing completes.

### What Happens During Processing

1. **Text Extraction** — The system reads text from your document
   - PDFs: native text extraction where possible; OCR for scanned images
   - DOCX: paragraph and table text extraction
   - Images: Tesseract OCR engine
2. **Chunking** — Text is split into overlapping segments for precise retrieval
3. **Embedding** — Each chunk is converted to a vector for semantic search
4. **Summarization** — An AI-generated summary is created

---

## Searching Documents

### How to Search

1. Click **Search** in the sidebar
2. Type your question or keywords in the search bar
3. Press **Enter** or click the **Search** button

### Search Tips

DocuMind uses **semantic search** — it understands meaning, not just keywords:

- ✅ `"What are the financial risks mentioned?"` — natural language works best
- ✅ `"sales figures Q3"` — keywords also work
- ✅ `"contract termination clauses"` — concept-based queries
- ❌ `"*financial*"` — wildcards are not supported

### Understanding Results

Each search result shows:
- **Document name** — which file the result came from
- **Excerpt** — the relevant text passage
- **Similarity score** — how relevant the result is (0–1, higher = more relevant)

Click any result to open the full document and see the passage highlighted in context.

### Filtering Search

- **Search within a specific document**: Open the document first, then use the search bar within the document view

---

## AI Assistant

The AI Assistant lets you have a conversation with your documents.

### Starting a Conversation

1. Click **Assistant** in the sidebar
2. Click **New Conversation**
3. Optionally give the conversation a title
4. Type your question in the input box
5. Press **Enter** or click **Send**

### Asking Good Questions

| ✅ Good Questions | ❌ Poor Questions |
|---|---|
| "What are the key financial risks in the 2026 annual report?" | "What does it say?" |
| "Summarize the terms of the employment contract" | "Tell me everything" |
| "What is the penalty for early termination?" | "Contract" |
| "Compare the Q2 and Q3 revenue figures" | "Numbers" |

### Understanding AI Responses

Every AI response includes:
- **Answer** — the AI's response based on your documents
- **Sources** — which document passages were used to generate the answer
- **Confidence** — indicated by the quality of source citations

> **Important:** AI responses are generated from your document content. Always verify important information against the original source.

### Conversation History

- All conversations are saved automatically
- Access past conversations from the **Conversations** list in the Assistant page
- Delete conversations by clicking the trash icon

---

## Managing Documents

### Viewing a Document

1. Click on any document in your Documents list or Dashboard
2. The detail page shows:
   - Document metadata (size, type, upload date)
   - Processing status
   - AI-generated summary
   - Extracted text preview

### Downloading a Document

On the document detail page, click **Download** to save the original file to your computer.

### Deleting a Document

1. Open the document or find it in the Documents list
2. Click the **Delete** button (trash icon)
3. Confirm deletion in the dialog

> **Warning:** Deletion is permanent. The file and all its search data will be removed.

---

## Bookmarks

Bookmarks let you save important documents for quick access.

### Bookmarking a Document

1. Open a document
2. Click the **Bookmark** icon (🔖)
3. Optionally add a note to remember why you bookmarked it
4. Click **Save Bookmark**

### Viewing Bookmarks

Click **Bookmarks** in the sidebar to see all your saved documents.

### Removing a Bookmark

Click the **🔖** icon again on a bookmarked document to remove it.

---

## Reminders

Set reminders to revisit important documents.

### Creating a Reminder

1. Open a document
2. Click **Set Reminder**
3. Choose a date and time
4. Add a note (e.g., "Review before the board meeting")
5. Click **Save Reminder**

### Managing Reminders

Click **Reminders** in the sidebar to:
- View all upcoming reminders
- Edit reminder dates and notes
- Delete reminders

---

## Account Settings

### Updating Your Profile

1. Click your avatar/name in the top-right corner
2. Select **Profile Settings**
3. Update your display name
4. Click **Save Changes**

### Changing Your Password

1. Go to **Profile Settings → Security**
2. Enter your current password
3. Enter and confirm your new password
4. Click **Change Password**

### Managing Active Sessions

1. Go to **Profile Settings → Security → Active Sessions**
2. View all devices where you're logged in
3. Click **Revoke** on any session to log out that device

---

## Tips & Best Practices

### For Best OCR Results (Images/Scanned PDFs)

- Use high-resolution scans (300 DPI or higher)
- Ensure good contrast between text and background
- Avoid heavily skewed or rotated pages
- For handwritten text: OCR accuracy may be lower

### For Best AI Results

- Upload complete, well-structured documents
- Use specific, detailed questions
- Break complex questions into smaller parts
- Always cite the AI's sources when sharing AI-generated information

### Organizing Your Documents

- Use descriptive filenames before uploading (e.g., `Q3-2026-Financial-Report.pdf`)
- Add titles and descriptions during upload
- Use bookmarks to mark frequently referenced documents
- Set reminders for time-sensitive documents

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `/` | Focus search bar |
| `Ctrl+U` | Go to Upload page |
| `Ctrl+A` | Open AI Assistant |
| `Escape` | Close dialogs/modals |

---

## Troubleshooting

### Document stuck in "Processing"

- Wait a few minutes — large documents may take longer
- Refresh the page
- If still processing after 10 minutes, try deleting and re-uploading

### "File type not supported" error

- Verify the file extension is PDF, DOCX, PNG, JPG, JPEG, GIF, BMP, or TIFF
- Ensure the file is not corrupted

### Search returns no results

- Your documents may still be processing — check the status
- Try rephrasing your query
- Ensure you have uploaded at least one document with relevant content

### AI response says "I couldn't find information about that"

- The content may not be in your uploaded documents
- Try rephrasing your question
- Upload the relevant document if you haven't already

### Login issues

- Check for typos in your email and password
- Use "Forgot Password" to reset
- Clear your browser cache if issues persist

---

## Privacy & Data

- Your documents are stored securely and are **only accessible by you**
- Document content is sent to Google's Gemini API for AI processing — please review Google's privacy policy
- You can delete your documents at any time
- Session management lets you remotely log out any device

---

## Getting Help

- **GitHub Issues**: [Report a bug](https://github.com/your-org/documind-ai/issues)
- **GitHub Discussions**: [Ask a question](https://github.com/your-org/documind-ai/discussions)
- **Email**: support@documind.ai
