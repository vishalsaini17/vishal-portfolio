# Portfolio Technical Documentation & Specification

Welcome to the technical documentation of the portfolio application. This document provides a detailed overview of the application architecture, system design, directory structures, collection schemas, and configuration settings, specifically addressing our Firebase integration.

---

## 🛠️ Tech Stack & Key Technologies

- **Frontend & Routing**: [React 19](https://react.dev/) using functional hooks and [React Router DOM v7](https://reactrouter.com/) for page state routing.
- **Build System**: [Vite v6](https://vite.dev/) offering high-performance client build compiling to static assets in `/dist`.
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) equipped with native CSS variables, unified theme values, and robust responsive configurations (`sm:`, `md:`, `lg:`).
- **Animations & Transitions**: [Motion (formerly Framer Motion) v12](https://motion.dev/) powering dynamic entrance fades, tab switching cross-fades, and interactive scaling wrappers.
- **Iconography**: [Lucide React](https://lucide.dev/) for elegant visual cues and action layout markers.
- **Backend & API Proxy**: [Express v4](https://expressjs.com/) with static build serving in production, integrated with Vite server in dev mode, and utilizing `esbuild` configurations.
- **Database & Services**: [Firebase v12 Cloud Firestore](https://firebase.google.com/) for rich real-time local persistence, structured collection schemas, and backend rules validating.

---

## 🔥 Firebase Configuration & Setup

The application connects to a real-time cloud-hosted **Google Firebase/Firestore** instance. This allows for instant synchronizations, profile modifications, live blogging, resume files loading, and dynamic message handling.

### 🔌 Client-Side Initialization Config
The application imports standard configuration values loaded from `firebase-applet-config.json` securely on boot:

| Param Config Key | Current Environment Value / Target |
| :--- | :--- |
| **Project ID** | `mindvsmachine-01` |
| **Auth Domain** | `mindvsmachine-01.firebaseapp.com` |
| **App ID** | `1:70340889387:web:d07bee1c9468751681d36e` |
| **Storage Bucket** | `mindvsmachine-01.firebasestorage.app` |
| **Firestore Database ID** | `ai-studio-f4315d27-f4ff-4c3a-9b84-9cfa83351ead` |
| **Messaging Sender ID** | `70340889387` |

---

## 🗄️ Database Schemas & Collections Diagram

All database persistence runs on **Google Cloud Firestore**. The layout and field parameters are structured based on `firebase-blueprint.json`:

```json
{
  "contacts": "ContactSubmission collection storing message submissions",
  "resumes": "Resume collection storing base64 content with ID 'latest'",
  "profile": "Profile collection storing configuration and UI details",
  "blogs": "BlogPost collection storing draft/published blogs"
}
```

### Detailed Collection Schema Reference

#### 1. `contacts` Collection (Schema: `ContactSubmission`)
Houses user contact form messages submitted through the frontend form.
- **`id`** (`string`, Required): Unique UUID descriptor.
- **`name`** (`string`, Required): Submitting user's full name.
- **`email`** (`string`, Required): Validated email address.
- **`message`** (`string`, Required): Standard text block containing raw response or body text.
- **`createdAt`** (`string` ISO date-time, Required): Chronological sorting stamp for active management.

#### 2. `resumes` Collection (Schema: `Resume`)
Stores PDF/doc file raw definitions. The active working profile represents `id: 'latest'`.
- **`id`** (`string`, Required): Unique ID, standard fallback is `latest`.
- **`fileName`** (`string`, Required): Display metadata for download actions.
- **`content`** (`string`, Required): Standard text contents or full base64 representation of the active resume file.
- **`updatedAt`** (`string` ISO date-time, Required): Last update timestamp.

#### 3. `profile` Collection (Schema: `Profile`)
Stores customizable profile configurations that define UI texts, bio metadata, and layout behaviors.
- **`profileName`** (`string`): Target presentation name.
- **`profileTitle`** (`string`): Professional title.
- **`profileAvatar`** (`string`): Direct URL pointing to asset.
- **`blogTitle`** (`string`): Blog homepage heading.
- **`blogDescription`** (`string`): Paragraph context for the blog feed.
- **`blogEnabled`** (`boolean`): Custom flag control for switching visibility of the Blog panel.

#### 4. `blogs` Collection (Schema: `BlogPost`)
Provides complete blogging layouts, containing an integrated Markdown custom-compiled WYSIWYG editor.
- **`id`** (`string`, Required): Unique document UUID.
- **`title`** (`string`, Required): Heading text.
- **`excerpt`** (`string`, Required): Intro snippet shown in cards list.
- **`content`** (`string`, Required): Rich raw Markdown contents.
- **`status`** (`string`, Required): Status matching `draft` or `published`.
- **`createdAt`** (`string` ISO date-time, Required): Initial creation datetime.
- **`updatedAt`** (`string` ISO date-time, Required): Chronological updating value.
- **`tags`** (`array` of strings): Focus topics category tags list.
- **`coverImage`** (`string`): Direct asset URL.

---

## 📂 Project Structure Blueprint

```bash
/src
├── App.tsx                    # Main layout application, routing switcher, and core UI wrapper
├── main.tsx                   # Main React script bootstrapper
├── index.css                  # Tailwinds v4 variables setup and global custom typography styling
└── components/
    ├── Header.tsx             # Floating navbar switch mechanism, desktop layout tabs, and responsive lists
    ├── Sidebar.tsx            # Floating profile presentation, bio, active email, download buttons, and details list
    ├── HomeTab.tsx            # Initial section showing interactive greetings, main profile intro, and quick call actions
    ├── ResumeTab.tsx          # Dynamic historical education, professional experience mapping, and custom skills list
    ├── WorkTab.tsx            # Projects listing dashboard, fully functional layout filters, and detailed preview cards
    ├── BlogTab.tsx            # Rich user-facing articles engine and dynamic blog cards
    ├── AdminTab.tsx           # Management control, containing custom profile edits, resume uploads, and articles logs
    ├── ContactTab.tsx         # User-facing interaction page containing forms submissions and social links
    ├── BlogMarkdownEditor.tsx # Highly functional custom Markdown builder containing split viewing & syntax formatting
    └── ProjectMarkdownEditor.tsx # Customizable visual rich-text Markdown wrapper for detailed projects mapping
```

---

## 🛡️ Security Rules Configuration
All communication with Firestore is gated using standard `firestore.rules`.
- Read rights are general for public assets (blogs, profiles, resumes).
- Write rights are restricted to authenticated admin entities to secure critical files.
- Form submissions to `/contacts` allow standard public execution with necessary validation blocks.
