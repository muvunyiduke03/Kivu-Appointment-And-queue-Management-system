"""add availability days and appointment time

Revision ID: 9d4b7b2f6a11
Revises: 3c41230d9dd5
Create Date: 2026-03-26 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9d4b7b2f6a11'
down_revision = '3c41230d9dd5'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('appointments', sa.Column('appointment_time', sa.Time(), nullable=True))
    op.execute("UPDATE appointments SET appointment_time = '08:00:00' WHERE appointment_time IS NULL")
    op.alter_column('appointments', 'appointment_time', nullable=False)

    op.create_table(
        'admin_availability_days',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('weekday', sa.Enum('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'), nullable=False),
        sa.Column('is_enabled', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('weekday')
    )


def downgrade():
    op.drop_table('admin_availability_days')
    op.drop_column('appointments', 'appointment_time')