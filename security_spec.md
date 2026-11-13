# Security Specification — SIWAKUR SMKN 9 Bulukumba

## 1. Data Invariants
1. **Wakur Authority**: Only a verified user matching the designated Wakasek Kurikulum email (`rahmathidayat552@guru.smk.belajar.id` with `email_verified == true`) can manage `whitelisted_teachers`, `whitelist_status`, `tasks`, and review `submissions`.
2. **No Self-Assigned Wakur Role**: A regular user creating `/users/{uid}` cannot assign `role: 'wakur'` unless `isWakur()` is satisfied; otherwise `role` must be `'guru'` and must match an active `whitelisted_teachers` entry assigned to `request.auth.uid`.
3. **One-Time Whitelist Claim**: A teacher claiming a `whitelisted_teachers/{email}` entry may only transition `isRegistered` from `false` to `true` and set `uid` to `request.auth.uid`, without altering PII fields (`fullName`, `nip`, `subject`, `email`).
4. **Submission Ownership & Parent Integrity**: Every submission must reference an existing `/tasks/{taskId}` and `/users/{teacherUid}`, and `teacherUid` must equal `request.auth.uid` on create.
5. **Terminal State Locking**: Once a submission reaches `status: 'Disetujui'`, the teacher cannot modify it unless the Wakasek Kurikulum changes its status.
6. **PII Isolation**: Unauthenticated users cannot `get` or `list` `/whitelisted_teachers` or `/users`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated PII Read**: `GET /whitelisted_teachers/guru@smkn9.sch.id` with `auth == null` -> `PERMISSION_DENIED`.
2. **Self-Elevation to Wakur**: `CREATE /users/{uid}` with `role: 'wakur'` from non-Wakur account -> `PERMISSION_DENIED`.
3. **Unverified Wakur Email Spoofing**: `CREATE /tasks/t1` with `auth.token.email == 'rahmathidayat552@guru.smk.belajar.id'` and `email_verified == false` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection on Task**: `CREATE /tasks/t1` with extra ghost field `isVerified: true` -> `PERMISSION_DENIED`.
5. **Orphaned Submission**: `CREATE /submissions/nonexistent_uid` referencing non-existent `taskId` -> `PERMISSION_DENIED`.
6. **Identity Spoofing on Submission**: `CREATE /submissions/t1_other` with `teacherUid: 'other_uid'` != `auth.uid` -> `PERMISSION_DENIED`.
7. **Self-Approval on Submission Create**: `CREATE /submissions/t1_uid` with `status: 'Disetujui'` -> `PERMISSION_DENIED`.
8. **Teacher Modifying Status to Approved**: `UPDATE /submissions/t1_uid` by teacher changing `status` to `'Disetujui'` or editing `revisionNote` -> `PERMISSION_DENIED`.
9. **Mutating Approved Submission**: `UPDATE /submissions/t1_uid` by teacher when `existing.status == 'Disetujui'` -> `PERMISSION_DENIED`.
10. **Hijacking Registered Whitelist Slot**: `UPDATE /whitelisted_teachers/guru@smk.id` when `existing.isRegistered == true` by non-Wakur -> `PERMISSION_DENIED`.
11. **Client Timestamp Forgery**: `CREATE /tasks/t1` with arbitrary `createdAt` != `request.time` -> `PERMISSION_DENIED`.
12. **Resource Poisoning / 1MB ID**: `CREATE /tasks/<200-char-invalid-id>` -> `PERMISSION_DENIED`.
