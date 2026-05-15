export function PrivacyPolicyPage() {
  return (
    <main className="legal-page">
      <div className="legal-card">
        <h1>Privacy Policy</h1>
        <p>
          Autism School Platform stores student, family, and staff data to support school coordination features such as
          sessions, notes, progress, and communication.
        </p>
        <p>
          Data access is role-based. School staff should only access records needed for their responsibilities. This
          policy is written for the project submission and should be reviewed by the school before use with real
          student data.
        </p>
        <h2>Data we process</h2>
        <ul>
          <li>Account information (name, email, role)</li>
          <li>Student information entered by authorized school staff</li>
          <li>Progress, reports, sessions, and chat content</li>
        </ul>
        <h2>Security</h2>
        <p>
          The application uses authentication, role checks, and HTTPS-ready deployment settings. Final production
          security controls depend on hosting setup and operational policies.
        </p>
        <h2>Contact</h2>
        <p>For school-specific privacy questions, contact your institution&apos;s administrator.</p>
      </div>
    </main>
  )
}
