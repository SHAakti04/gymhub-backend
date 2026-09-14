ALTER TABLE competition_participants
  ADD UNIQUE KEY uq_competition_member (competition_id, member_id);