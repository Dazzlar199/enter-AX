-- Adds the 'scam-alert' board (fake-agency / pay-to-audition warnings) to the allowed post categories.
ALTER TABLE community_posts DROP CONSTRAINT community_posts_category_check;
ALTER TABLE community_posts
  ADD CONSTRAINT community_posts_category_check
  CHECK (category IN ('free', 'question', 'success-story', 'information', 'scam-alert'));
