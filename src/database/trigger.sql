-- Trigger to automatically create a public user when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (new.id, new.email, 'super_admin');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Since you already created your first user, let's manually insert it into public.users if it's missing:
INSERT INTO public.users (id, email, role)
SELECT id, email, 'super_admin'
FROM auth.users
WHERE email = 'kjeevankumar944@gmail.com'
ON CONFLICT (id) DO NOTHING;
