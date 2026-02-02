# Project Request - [Brief Title]

**Request ID**: REQ-[XXX]  
**Submitted By**: [Your Name]  
**Date**: [YYYY-MM-DD]  
**Priority**: [Critical/High/Medium/Low]  
**Status**: Pending

---

## What Do You Want Built?

[Describe in plain language what you want. Be as detailed or high-level as you like. The PM Agent will ask clarifying questions if needed.]

**Example**: "I want a login system where users can sign in with email/password and be redirected to a dashboard."

---

## Why Do You Need This?

[What problem does this solve? What value does it provide?]

**Example**: "Users need to securely access the application and see their personalized data."

---

## Who Is This For?

[Who will use this feature? What's their role?]

**Example**: "All users of the application - both free and paid tiers."

---

## Success Criteria

[How will you know when this is done correctly? What does "success" look like?]

**Example**:
- User can log in with email/password
- User is redirected to dashboard after login
- Invalid credentials show clear error message
- User stays logged in across sessions

---

## Constraints or Requirements

[Any technical requirements, deadlines, or constraints the team should know about?]

**Example**:
- Must work on mobile and desktop
- Must be done by end of month
- Must support password reset flow
- Must integrate with existing user database

---

## Nice-to-Haves (Optional)

[Features that would be great but aren't critical]

**Example**:
- Remember me checkbox
- Social login (Google, GitHub)
- Two-factor authentication

---

## Context or Background

[Any additional context that might help the team understand this better]

**Example**: "This is the first feature users will interact with, so it needs to make a good impression. Our competitors have clunky login flows - we want ours to be smooth."

---

## Questions for PM Agent

[Any specific questions you have or areas where you need guidance]

**Example**:
- Should we use JWT tokens or sessions?
- Do we need email verification before first login?
- What's the best approach for password security?

---

## Attachments

[Link to or describe any mockups, diagrams, examples, or reference materials]

**Example**:
- See Figma mockup: [link]
- Reference implementation: [competitor URL]
- User flow diagram: [attached]

---

**PM Agent Instructions**:
When you receive this request:
1. Read and analyze the full request
2. Ask clarifying questions if anything is unclear
3. Break this into a technical design task (DESIGN-XXX)
4. Create individual implementation tasks
5. Move to `/requests/in-analysis/` while working
6. Present breakdown to human for approval
7. Move to `/requests/approved/` when approved
8. Begin implementation via task system
