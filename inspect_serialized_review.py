from app import create_app
from models import Course, User

app = create_app()
with app.app_context():
    user = User.query.get(1)
    course = Course.query.first()
    with app.test_client() as client:
        with client.session_transaction() as session:
            session['_user_id'] = str(user.id)
            session['_fresh'] = True
        response = client.get(f'/api/courses/{course.id}/reviews')
        data = response.get_json()
        for item in data['reviews']:
            if item['id'] == 6:
                print(item)
                break
