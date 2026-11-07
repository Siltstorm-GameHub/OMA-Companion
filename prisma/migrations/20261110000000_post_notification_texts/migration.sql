-- Benachrichtigungstexte an die Zusammenlegung zum Content Creator anpassen (Beitrag statt Bericht/Bild/Werbe-Post).
-- Ersetzt nur Texte, die noch dem alten Standard entsprechen — von Admins angepasste Texte bleiben unberührt.

UPDATE "NotificationRule" SET "label" = 'Beitrag ergänzt' WHERE "key" = 'report_contribution' AND "label" = 'Bericht ergänzt';
UPDATE "NotificationRule" SET "description" = 'Wenn jemand deinen Beitrag ergänzt.' WHERE "key" = 'report_contribution' AND "description" = 'Wenn ein anderer Journalist deinen Bericht ergänzt.';
UPDATE "NotificationRule" SET "titleTemplate" = '✍️ {authorName} hat deinen Beitrag ergänzt' WHERE "key" = 'report_contribution' AND "titleTemplate" = '✍️ {authorName} hat deinen Bericht ergänzt';
UPDATE "NotificationRule" SET "description" = 'Wenn jemand dein Bild aus der Mediathek als Titelbild seines Beitrags nutzt.' WHERE "key" = 'asset_used' AND "description" = 'Wenn ein Journalist dein Bild als Titelbild oder ein Marketing Manager es in einem Post nutzt.';
UPDATE "NotificationRule" SET "label" = 'Beitrag extern bestätigt' WHERE "key" = 'marketing_post_confirmed' AND "label" = 'Werbe-Post extern bestätigt';
UPDATE "NotificationRule" SET "description" = 'Wenn ein Admin bestätigt, dass dein Beitrag extern (z.B. Instagram) veröffentlicht wurde.' WHERE "key" = 'marketing_post_confirmed' AND "description" = 'Wenn ein Admin bestätigt, dass dein Werbe-Post extern (z.B. Instagram) veröffentlicht wurde.';
UPDATE "NotificationRule" SET "titleTemplate" = '✅ Dein Beitrag wurde extern veröffentlicht' WHERE "key" = 'marketing_post_confirmed' AND "titleTemplate" = '✅ Dein Post wurde extern veröffentlicht';
UPDATE "NotificationRule" SET "description" = 'Ein Coach bittet die Content Creator, einen Trainings-Termin zu bewerben.' WHERE "key" = 'promotion_request' AND "description" = 'Ein Coach bittet die Marketing Manager, einen Trainings-Termin zu bewerben.';
UPDATE "NotificationRule" SET "description" = 'Ein Content Creator hat einen Beitrag zu deinem Training veröffentlicht.' WHERE "key" = 'promotion_fulfilled' AND "description" = 'Ein Marketing Manager hat einen Werbe-Post zu deinem Training erstellt.';
UPDATE "NotificationRule" SET "label" = 'In Beitrag erwähnt' WHERE "key" = 'report_mention' AND "label" = 'In Bericht erwähnt';
UPDATE "NotificationRule" SET "description" = 'Wenn du in einem Beitrag oder einer Ergänzung erwähnt wirst.' WHERE "key" = 'report_mention' AND "description" = 'Wenn du in einem Bericht oder einer Ergänzung erwähnt wirst.';
UPDATE "NotificationRule" SET "description" = 'Jemand aus der Community bittet die Content Creator um ein Bild.' WHERE "key" = 'photo_request' AND "description" = 'Ein Community-Job-Mitglied (Journalist, Marketing Manager, Coach, Visionär) bittet die Fotografen um ein Bild.';
UPDATE "NotificationRule" SET "description" = 'Ein Content Creator hat deinen Bildwunsch erfüllt.' WHERE "key" = 'photo_request_fulfilled' AND "description" = 'Ein Fotograf hat deinen Bildwunsch erfüllt.';
UPDATE "NotificationRule" SET "bodyTemplate" = '{fotografName} hat einen Beitrag mit Bild veröffentlicht — du findest es auch in der Mediathek.' WHERE "key" = 'photo_request_fulfilled' AND "bodyTemplate" = '{fotografName} hat ein Bild hochgeladen — du findest es in der Mediathek.';
