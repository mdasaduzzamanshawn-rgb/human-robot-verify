-- Run AFTER creating the administrator in Supabase > Authentication > Users.
insert into public.admin_users (user_id, email, role)
select id, email, 'admin' from auth.users
where lower(email) = lower('asaduzzamanshwan366@gmail.com')
on conflict (user_id) do nothing;

select * from public.admin_users;  -- should show one row
