"""
Defensive migration: repair `incidences_incidence.room_number` -> `room_number_id`.

Some tenant schemas were created when `Incidence.room_number` was a
`CharField`. After the field was converted to a `ForeignKey` and the
migration history was squashed into `0001_initial`, those schemas still
have the old `room_number` VARCHAR column even though Django marks the
initial migration as applied. Reads against the model then fail with:

    column incidences_incidence.room_number_id does not exist
    HINT:  Perhaps you meant to reference the column
           "incidences_incidence.room_number".

This migration is a no-op for schemas already on the new layout. For
schemas still on the old layout, it drops the legacy column and adds
`room_number_id` with the FK and index that Django expects.
"""

from django.db import migrations


def repair_room_number(apps, schema_editor):
    connection = schema_editor.connection
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = 'incidences_incidence'
              AND column_name IN ('room_number', 'room_number_id')
            """
        )
        columns = {row[0] for row in cursor.fetchall()}

        # Already on the new layout — nothing to do.
        if "room_number_id" in columns:
            return

        # Table missing or in an unexpected state — let later migrations
        # / schema sync handle it; don't risk destructive changes here.
        if "room_number" not in columns:
            return

        cursor.execute("ALTER TABLE incidences_incidence DROP COLUMN room_number;")
        cursor.execute(
            "ALTER TABLE incidences_incidence ADD COLUMN room_number_id BIGINT NULL;"
        )
        cursor.execute(
            """
            ALTER TABLE incidences_incidence
            ADD CONSTRAINT incidences_incidence_room_number_id_fkey
            FOREIGN KEY (room_number_id) REFERENCES bedrooms_bedroom(id)
            ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
            """
        )
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS incidences_incidence_room_number_id_idx
            ON incidences_incidence(room_number_id);
            """
        )


def noop_reverse(apps, schema_editor):
    # We deliberately do not reintroduce the legacy VARCHAR column.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("incidences", "0001_initial"),
        ("bedrooms", "0003_bedroomauditlog_index"),
    ]

    operations = [
        migrations.RunPython(repair_room_number, noop_reverse),
    ]
