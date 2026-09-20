ALTER TABLE competition_participants
  ADD CONSTRAINT uq_competition_member UNIQUE (competition_id, member_id);