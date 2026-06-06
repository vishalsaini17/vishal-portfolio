# Security Specification

## Data Invariants

1. **Contacts Collection**
   - Anyone can write a contact form submission (so users can send messages).
   - Only Bootstrapped Admins (`vishalsaini154@gmail.com` with verified email) can read, retrieve, or delete submissions.
   - Submissions cannot be updated once created.
   - Schema validation requires:
     - `name` is a string, size between 1 and 256 characters.
     - `email` is a string matching regex pattern for emails, size between 5 and 256.
     - `message` is a string, size between 5 and 5000 characters.
     - `id` is a valid string ID,.
     - `createdAt` matches exactly `request.time`.

2. **Resumes Collection**
   - Anyone can read/get the resume (so the portfolio download button works).
   - Only Bootstrapped Admins can write, update, or delete resume documents.
   - Schema validation requires:
     - `fileName` is a string, size between 1 and 128 characters.
     - `content` is a string representing text or base64 structure.
     - `id` must be 'latest'.
     - `updatedAt` matches exactly `request.time`.

---

## The "Dirty Dozen" Payloads (Rogue payloads)

Below are the 12 malicious payloads designed to violate system rules:

1. **Spoofed Admin (No Authentication)**: Attempting to read `contacts` without signing in.
2. **Spoofed Admin (Email spoof only)**: Sign in as another user, but send a request asserting they are the admin.
3. **Admin Email verification bypass**: Logged in as `vishalsaini154@gmail.com` but with `email_verified = false`.
4. **Mutate Contact Submission**: Attempt to update an existing contact submission.
5. **Contact Field Injection**: Trying to create a contact submission with a custom parameter `isAdmin: true` inside.
6. **Sub-minimum Contact Name**: Creating a contact message where `name` is empty.
7. **Contact String size attack**: Creating a submission where `message` is a 10MB chunk of characters.
8. **Contact Client Timestamp spoof**: Submit a contact entry with a pre-backdated `createdAt` timestamp.
9. **Guest Writing Resume**: Non-admin attempting to upload/create a resume document.
10. **Resume format spoofing**: Uploading a resume with a corrupted format or `id` other than 'latest'.
11. **Malicious Delete**: Public user trying to delete a contact message.
12. **Malicious Resume wipe**: Public user trying to delete the CV.

---

## Rules Test Runner Verification

The security rules require all malicious accesses above to return `PERMISSION_DENIED`. The following rules define these protections.
