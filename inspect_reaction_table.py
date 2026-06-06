from app import create_app
from models import ReviewReaction, db

app = create_app()
with app.app_context():
    db.create_all()
    print('ReviewReaction rows', ReviewReaction.query.count())
    print('Tables', [table.name for table in db.metadata.sorted_tables])
