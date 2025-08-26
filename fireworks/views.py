# fireworks/views.py
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.decorators import login_required
from .models import Post, FireworkProgram
from .forms import PostForm
from django.contrib import messages
from django.http import JsonResponse
import json

def top(request):
    """トップページを表示します"""
    return render(request, 'fireworks/top.html')

def index(request):
    """
    投稿一覧ページ
    ログインしていないユーザーもアクセス可能
    """
    posts = Post.objects.all()

    post_type_filter = request.GET.get('post_type', None)
    if post_type_filter:
        posts = posts.filter(post_type=post_type_filter)

    context = {
        'posts': posts,
        'post_type_filter': post_type_filter,
    }
    return render(request, 'fireworks/index.html', context)


@login_required
def mypage(request):
    """
    マイページ
    ログインユーザーのみアクセス可能
    """
    user_posts = Post.objects.filter(user=request.user)
    user_programs = FireworkProgram.objects.filter(user=request.user)
    
    context = {
        'user_posts': user_posts,
        'user_programs': user_programs,
    }
    return render(request, 'fireworks/mypage.html', context)


@login_required
def create_firework(request):
    """
    花火作成ページ
    ログインユーザーのみアクセス可能
    花火プログラムのPOSTリクエストを処理
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            title = data.get('title', '無題の花火')
            description = data.get('description', '')
            program_data = data.get('program_data')

            if not program_data:
                return JsonResponse({'success': False, 'message': 'プログラムデータがありません。'}, status=400)

            # FireworkProgramをデータベースに保存
            firework_program = FireworkProgram(
                user=request.user,
                title=title,
                description=description,
                program_data=program_data
            )
            firework_program.save()

            # Postモデルにも登録 (fileは明示的にNoneに設定)
            Post.objects.create(
                user=request.user,
                title=title,
                description=description,
                post_type='program',
                firework_program=firework_program,
                file=None
            )

            return JsonResponse({'success': True})

        except json.JSONDecodeError:
            # JSONのパースエラー
            return JsonResponse({'success': False, 'message': '無効なJSONです。'}, status=400)
        except Exception as e:
            # その他の予期せぬエラー
            print("保存中にエラーが発生しました:", e)  # デバッグのためにエラーをコンソールに出力
            return JsonResponse({'success': False, 'message': f'サーバーエラーが発生しました: {str(e)}'}, status=500)
    
    # GETリクエストの場合
    return render(request, 'fireworks/ff_create.html')

@login_required
def create_post(request):
    """
    写真、イラスト、動画を投稿するページ
    """
    if request.method == 'POST':
        form = PostForm(request.POST, request.FILES)
        if form.is_valid():
            post = form.save(commit=False)
            post.user = request.user
            post.save()
            messages.success(request, '投稿が完了しました！')
            return redirect('index')
    else:
        form = PostForm()
    
    return render(request, 'fireworks/ff_create_post.html', {'form': form})

@login_required
def delete_post(request, pk):
    """
    投稿を削除します。
    POSTリクエストでのみ削除を実行し、不正なアクセスを防ぎます。
    """
    post = get_object_or_404(Post, pk=pk, user=request.user)
    if request.method == 'POST':
        post.delete()
        messages.success(request, '投稿を削除しました。')
    return redirect('mypage')

def signup(request):
    """
    ユーザー新規登録ページ
    """
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            messages.success(request, '登録が完了しました！ログインしてください。')
            return redirect('login') 
    else:
        form = UserCreationForm()
    return render(request, 'fireworks/signup.html', {'form': form})

# 新しいビュー関数
def get_firework_program(request, pk):
    """
    指定されたIDの花火プログラムをJSON形式で返す
    """
    program = get_object_or_404(FireworkProgram, pk=pk)
    
    data = {
        'id': program.id,
        'title': program.title,
        'program_data': program.program_data,
        'user': program.user.username,
        'created_at': program.created_at.strftime('%Y-%m-%d %H:%M:%S')
    }
    return JsonResponse(data)
