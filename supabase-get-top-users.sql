-- Function to get top users by likes received in the last month
CREATE OR REPLACE FUNCTION get_top_users_by_likes(time_period interval DEFAULT '1 month'::interval)
RETURNS TABLE (
  user_id text,
  name text,
  image text,
  total_likes bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.user_id,
    u.name,
    u.image,
    COUNT(pl.post_id) as total_likes
  FROM
    public.post_likes pl
  JOIN
    public.posts p ON pl.post_id = p.id
  JOIN
    public.users u ON p.user_id = u.id
  WHERE
    pl.created_at > (now() - time_period)
  GROUP BY
    p.user_id, u.name, u.image
  ORDER BY
    total_likes DESC
  LIMIT 5;
END;
$$;
