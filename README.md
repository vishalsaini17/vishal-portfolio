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

The application connects to a cloud-hosted **Google Firebase & Cloud Firestore** database to power instant data synchronization, portfolio profile customization, blogging, resume file management, and contact message collection.

To secure sensitive keys and project details, specific credentials are kept out of this repository's public source. Follow the steps below to configure your own Firebase environment.

---

## 🛠️ Setup Instructions for New Users

If you have downloaded or cloned this repository and want to run it with your own Firebase database, satisfy these pre-requisites:

### 1. Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** and follow the prompts to create a new project.
3. Once created, register a new **Web App** in your project dashboard (click the Web `</>` icon).
4. Note the Firebase configuration object provided in the final screen.

### 2. Configure Firebase Services
The app relies on two primary Firebase features:
- **Cloud Firestore**:
  - Go to Firestore Database in the Firebase left navigation bar.
  - Click **Create Database**.
  - Select your preferred database location and start in **Production mode** or **Test mode**.
  - Create the required collections: `contacts`, `resumes`, `profile`, and `blogs` (the app can also generate these schemas automatically on first write).
- **Firebase Authentication**:
  - Go to Authentication in the left navigation bar.
  - Click **Get Started** and enable **Google** as a Sign-In Provider (needed for the Admin Tab login authorization).
  - Add your authorized redirect domains (e.g., `localhost` for local development).

### 3. Apply Local Configurations
The application reads the connection parameters from `/firebase-applet-config.json` at root on startup.
1. Create a file named `firebase-applet-config.json` at the root of the project (if it does not exist already).
2. Populate the file with your specific web configuration keys from the Firebase console, using the template below:

```json
{
  "projectId": "your-firebase-project-id",
  "appId": "your-firebase-app-id",
  "apiKey": "your-firebase-web-api-key",
  "authDomain": "your-firebase-project-id.firebaseapp.com",
  "firestoreDatabaseId": "(default)",
  "storageBucket": "your-firebase-project-id.firebasestorage.app",
  "messagingSenderId": "your-messaging-sender-id"
}
```

*Note: If you use a custom named Firestore database instead of the `(default)` database, replace `"(default)"` with your specific database ID string.*

---

## ⚡ Environment & Startup Variables

To integrate external AI services or run production-ready servers, add a `.env` file at the root of the project. A template has been provided in `.env.example`:

1. **`GEMINI_API_KEY`**: (Optional) Add your Google Gemini developer key if utilizing AI-assisted text generation or summarization.
2. **`APP_URL`**: (Optional) Provide your app's hosted domain (e.g. `http://localhost:3000` or a deployed custom URL) for secure redirects and OAuth mappings.

### Running Local Development Server

Once your config file `/firebase-applet-config.json` is set up with valid credentials:

```bash
# 1. Install local dependencies
npm install

# 2. Run the full-stack development environment
npm run dev

# 3. Build & compile for server deployment
npm run build
npm run start
```

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
