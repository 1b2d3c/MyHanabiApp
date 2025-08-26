from django.urls import path
from . import views
from django.contrib.auth import views as auth_views

urlpatterns = [
    path('', views.top, name='top'),
    path('index/', views.index, name='index'),
    path('signup/', views.signup, name='signup'),
    path('login/', auth_views.LoginView.as_view(template_name='fireworks/login.html'), name='login'),
    path('logout/', auth_views.LogoutView.as_view(next_page='index'), name='logout'),
    
    # 花火プログラム作成ページ
    path('create_firework/', views.create_firework, name='create_firework'),
    
    # 新しい投稿作成ページ
    path('create_post/', views.create_post, name='create_post'),

    path('post/<int:pk>/delete/', views.delete_post, name='delete_post'),

    path('mypage/', views.mypage, name='mypage'),
    
    # 花火プログラムのデータ取得用URL
    path('program/<int:pk>/', views.get_firework_program, name='get_firework_program'),
]
