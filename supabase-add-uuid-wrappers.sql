-- Add UUID wrappers for RPC functions to handle both TEXT and UUID inputs
-- This ensures compatibility regardless of how the client sends the ID

-- 1. Fix can_make_ai_call
CREATE OR REPLACE FUNCTION public.can_make_ai_call(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.can_make_ai_call(p_user_id::TEXT);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.can_make_ai_call(UUID) IS 'Wrapper for can_make_ai_call accepting UUID';

GRANT EXECUTE ON FUNCTION public.can_make_ai_call(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_make_ai_call(UUID) TO anon, authenticated, service_role;


-- 2. Fix increment_ai_call_count
CREATE OR REPLACE FUNCTION public.increment_ai_call_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM public.increment_ai_call_count(p_user_id::TEXT);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.increment_ai_call_count(UUID) IS 'Wrapper for increment_ai_call_count accepting UUID';

GRANT EXECUTE ON FUNCTION public.increment_ai_call_count(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_ai_call_count(UUID) TO anon, authenticated, service_role;


-- 3. Fix can_add_entry
CREATE OR REPLACE FUNCTION public.can_add_entry(
    p_user_id UUID,
    p_card_type TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.can_add_entry(p_user_id::TEXT, p_card_type);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.can_add_entry(UUID, TEXT) IS 'Wrapper for can_add_entry accepting UUID';

GRANT EXECUTE ON FUNCTION public.can_add_entry(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_add_entry(UUID, TEXT) TO anon, authenticated, service_role;


-- 4. Fix increment_entry_count
CREATE OR REPLACE FUNCTION public.increment_entry_count(
    p_user_id UUID,
    p_card_type TEXT
)
RETURNS VOID AS $$
BEGIN
    PERFORM public.increment_entry_count(p_user_id::TEXT, p_card_type);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.increment_entry_count(TEXT, TEXT) IS 'Wrapper for increment_entry_count accepting UUID';
GRANT EXECUTE ON FUNCTION public.increment_entry_count(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_entry_count(UUID, TEXT) TO anon, authenticated, service_role;
