# ReadingDeck App Submission Notes

Last updated: `2026-05-31`

This checklist is for preparing the ReadingDeck ChatGPT app for Apps SDK submission.

## 1. Required non-code items

- Publish a public Privacy Policy URL
- Prepare a support contact email
- Prepare an authenticated demo account with sample books and cards
- Confirm the production Worker and production backend are deployed and stable

## 2. Product summary

ReadingDeck helps users:

- view books already saved in their ReadingDeck library
- search cards related to a topic, question, or idea
- find real books before adding them to ReadingDeck
- create books in ReadingDeck
- save cards under a specific book

## 3. Core product rule

ReadingDeck is book-centric.

- Cards must belong to a specific book
- The app should not create free-floating notes without a target book
- If a user wants to save a card and no book is identified, the flow should first help identify or create the book

## 4. Current tool set

- `search-cards`
- `get-recent-cards`
- `get-read-books`
- `search-books`
- `get-cards-by-book`
- `create-book`
- `create-card`

## 5. Submission QA script

Suggested reviewer flow:

1. Sign in to ReadingDeck
2. Ask: `What books do I already have in ReadingDeck?`
3. Ask: `Find cards related to fear of change`
4. Ask: `Search for the book 완벽한 원시인`
5. Ask: `Add that book to ReadingDeck`
6. Ask: `Save this sentence as an insight card in that book`

## 6. Before submission

- Verify all tools work in a fresh chat
- Verify loading, empty, and error states
- Verify dark and light theme rendering
- Verify the widget loads without CSP or asset errors
- Verify OAuth sign-in works from a clean account

## 7. Open items to finalize

- Replace placeholder support email in the privacy policy
- Replace retention period placeholders
- Decide final public-facing app description and icon
- Confirm whether `search-cards` and other tool names are final

