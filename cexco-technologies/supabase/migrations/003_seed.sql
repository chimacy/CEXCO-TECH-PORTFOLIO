-- CEXCO TECHNOLOGIES — starter content. Items flagged is_sample = true are demo content; delete or edit in /admin.
insert into public.site_settings (id, brand_name, tagline, short_description, about_description, currency, seo_title, seo_description,
  footer_text, copyright_text, default_contact_message, business_hours, social_links)
values (1, 'CEXCO TECHNOLOGIES', 'Design that gets noticed.',
  'A creative design studio for brands, businesses, events and institutions.',
  'CEXCO TECHNOLOGIES is a design studio focused on clear, memorable visual communication — from flyers and social media graphics to complete brand identities.',
  '₦', 'CEXCO TECHNOLOGIES — Design Portfolio', 'Browse the design portfolio of CEXCO TECHNOLOGIES and request flyers, logos, brand identities and more.',
  'Creative design for brands, businesses and institutions.', '© CEXCO TECHNOLOGIES. All rights reserved.',
  'Hello CEXCO TECHNOLOGIES, I would like to discuss a design project.', 'Mon–Sat, 9:00 AM – 6:00 PM', '{}'::jsonb)
on conflict (id) do nothing;

insert into public.categories (name, slug, description, sort_order) values
 ('Graphic Design','graphic-design','General graphic design for print and digital.',1),
 ('Flyer Design','flyer-design','Event, business and promotional flyers.',2),
 ('Social Media Design','social-media-design','Posts, stories and campaign graphics.',3),
 ('Brand Identity','brand-identity','Complete visual identity systems.',4),
 ('Logo Design','logo-design','Distinctive logos and marks.',5),
 ('Event Design','event-design','Invitations, banners and event graphics.',6),
 ('Business Design','business-design','Cards, letterheads, brochures and profiles.',7),
 ('Political & Leadership Design','political-leadership-design','Campaign and leadership visuals.',8),
 ('Academic Design','academic-design','Departmental, conference and school graphics.',9),
 ('Product Advertisement','product-advertisement','Product ads and promotional creatives.',10),
 ('Church & Religious Design','church-religious-design','Programs, banners and event graphics.',11),
 ('Custom Design','custom-design','Anything else you have in mind.',12)
on conflict (slug) do nothing;

insert into public.services (name, slug, short_description, description, starting_price, price_label, category_id, featured, status, sort_order, is_sample)
select v.name, v.slug, v.sd, v.d, v.price, v.label, (select id from public.categories c where c.slug = v.cat), v.feat, 'published', v.ord, true
from (values
 ('Flyer Design','flyer-design','Eye-catching flyers for any occasion.','Print- and social-ready flyers designed to communicate clearly and stand out.',5000,'Starting from','flyer-design',true,1),
 ('Social Media Design','social-media-design','Consistent graphics for your channels.','Post, story and campaign graphics tailored to your brand and platforms.',3000,'Starting from','social-media-design',true,2),
 ('Logo Design','logo-design','A mark that represents you.','Concept exploration, refinement and delivery of final logo files.',15000,'Starting from','logo-design',true,3),
 ('Brand Identity','brand-identity','A complete visual system.','Logo, colour, typography and usage guidelines for a coherent brand.',60000,'Starting from','brand-identity',false,4),
 ('Event Graphics','event-graphics','Invitations, banners and screens.','Complete event visuals for physical and digital promotion.',8000,'Starting from','event-design',false,5),
 ('Business Graphics','business-graphics','Cards, brochures and company profiles.','Professional stationery and collateral for businesses.',null,'Contact for pricing','business-design',false,6)
) as v(name,slug,sd,d,price,label,cat,feat,ord)
on conflict (slug) do nothing;

insert into public.pricing_items (service_id, title, description, price, price_label, features, featured, sort_order)
select (select id from public.services s where s.slug = v.svc), v.title, v.d, v.price, v.label, v.feats, v.feat, v.ord
from (values
 ('flyer-design','Flyer Design','Single-sided flyer',5000::numeric,'Starting from',array['Custom layout','2 revisions','Print & web files'],false,1),
 ('social-media-design','Social Media Design','Post or story graphic',3000::numeric,'Starting from',array['Platform-ready sizes','2 revisions','Source on request'],false,2),
 ('logo-design','Logo Design','Logo with final files',15000::numeric,'Starting from',array['Multiple concepts','3 revisions','Vector + PNG files'],true,3),
 ('brand-identity','Brand Identity','Full identity system',60000::numeric,'Starting from',array['Logo suite','Colour & type system','Brand guidelines'],false,4),
 ('event-graphics','Event Graphics','Event visual package',8000::numeric,'Starting from',array['Invitation / banner','Social variants','Print-ready files'],false,5),
 ('business-graphics','Business Graphics','Stationery & collateral',null::numeric,'Contact for pricing',array['Tailored to scope','Print-ready files'],false,6)
) as v(svc,title,d,price,label,feats,feat,ord);

insert into public.portfolio_projects (title, slug, short_description, description, category_id, service_id, client_name, client_type, price, price_label, featured, status, sort_order, is_sample)
select v.title, v.slug, v.sd, v.d, (select id from public.categories where slug = v.cat), (select id from public.services where slug = v.svc),
       v.client, v.ctype, v.price, v.label, v.feat, 'published', v.ord, true
from (values
 ('Sample — Christmas Event Flyer','christmas-event-flyer','Festive event flyer (sample).','Sample project. Replace this with your own work from the admin panel.','flyer-design','flyer-design','Sample Client','Church',5000::numeric,'From',true,1),
 ('Sample — Product Launch Post','product-launch-post','Social launch graphic (sample).','Sample project. Replace this with your own work from the admin panel.','social-media-design','social-media-design','Sample Client','Retail',3000::numeric,'From',true,2),
 ('Sample — Logo Mark','sample-logo-mark','Minimal logo mark (sample).','Sample project. Replace this with your own work from the admin panel.','logo-design','logo-design','Sample Client','Startup',15000::numeric,'From',true,3),
 ('Sample — Brand Identity System','sample-brand-identity','Identity system (sample).','Sample project. Replace this with your own work from the admin panel.','brand-identity','brand-identity','Sample Client','Hospitality',60000::numeric,'From',true,4),
 ('Sample — Conference Banner','sample-conference-banner','Academic conference banner (sample).','Sample project. Replace this with your own work from the admin panel.','academic-design','event-graphics','Sample Client','Academic',8000::numeric,'From',false,5),
 ('Sample — Company Profile','sample-company-profile','Company profile layout (sample).','Sample project. Replace this with your own work from the admin panel.','business-design','business-graphics','Sample Client','Business',null::numeric,'Contact for pricing',false,6)
) as v(title,slug,sd,d,cat,svc,client,ctype,price,label,feat,ord)
on conflict (slug) do nothing;

insert into public.testimonials (client_name, role_company, quote, is_published, featured, sort_order, is_sample) values
 ('Sample Client A','Event Organiser','Sample testimonial — replace with a real client quote from the admin panel.',true,true,1,true),
 ('Sample Client B','Small Business Owner','Sample testimonial — replace with a real client quote from the admin panel.',true,true,2,true),
 ('Sample Client C','Ministry Leader','Sample testimonial — replace with a real client quote from the admin panel.',true,false,3,true);

insert into public.homepage_sections (key, title, subtitle, description, cta_text, cta_link, is_visible, sort_order, config) values
 ('hero','We turn ideas into visual experiences.',null,'Flyers, brand identities, social media and event design — crafted with clarity and care.','Explore our work','/portfolio',true,1,
   '{"badge":"Design Studio","secondary_cta_text":"Start a project","secondary_cta_link":"/request","hero_image_url":null,"featured_project_id":null}'),
 ('featured_work','Selected work','Featured projects','A look at recent projects.','View all work','/portfolio',true,2,'{"limit":6,"item_ids":[]}'),
 ('services','Services','What we do','Design services for every need.','All services','/services',true,3,'{"limit":6,"item_ids":[]}'),
 ('categories','Browse by category',null,'Find the type of design you need.','All categories','/portfolio',true,4,'{"limit":8,"item_ids":[]}'),
 ('about','About us',null,null,'Learn more','/about',true,5,'{}'),
 ('process','How it works','Simple process','From request to delivery.',null,null,true,6,'{}'),
 ('testimonials','Kind words','Client feedback',null,null,null,true,7,'{"limit":3,"item_ids":[]}'),
 ('pricing','Pricing','Transparent starting prices','Final quotes depend on scope.','See full pricing','/pricing',true,8,'{"limit":3,"item_ids":[]}'),
 ('cta','Have a project in mind?',null,'Tell us what you need and we will get back to you.','Start a project','/request',true,9,'{}'),
 ('contact','Get in touch',null,'We would love to hear from you.','Contact us','/contact',true,10,'{}')
on conflict (key) do nothing;

insert into public.pages (slug, title, heading, intro, body, mission, vision, values_list) values
 ('about','About','About CEXCO TECHNOLOGIES','We help brands and organisations communicate through thoughtful design.','<p>Edit this text from Admin → Pages → About.</p>','To make professional design accessible and dependable.','To be a trusted creative partner for growing brands.',array['Clarity','Craft','Reliability','Collaboration']),
 ('contact','Contact','Contact us','Reach out about a project or a question.',null,null,null,'{}'),
 ('privacy','Privacy Policy','Privacy Policy',null,'<p>Edit this policy from Admin → Pages. Replace it with your own legally reviewed text.</p>',null,null,'{}'),
 ('terms','Terms of Service','Terms of Service',null,'<p>Edit these terms from Admin → Pages. Replace them with your own legally reviewed text.</p>',null,null,'{}')
on conflict (slug) do nothing;

insert into public.stats (value, label, sort_order) values ('100+','Projects Completed',1),('50+','Happy Clients',2),('20+','Services Delivered',3);
insert into public.process_steps (step_number, title, description, sort_order) values
 ('01','Submit Request','Tell us about your project and share references.',1),
 ('02','Discuss Project','We confirm scope, timeline and price.',2),
 ('03','Design & Review','You review drafts and request revisions.',3),
 ('04','Final Delivery','Receive print- and web-ready files.',4);
