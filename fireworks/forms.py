from django import forms
from .models import Post

class PostForm(forms.ModelForm):
    """
    投稿フォーム
    """
    class Meta:
        model = Post
        fields = ['title', 'description', 'post_type', 'file']
        widgets = {
            'title': forms.TextInput(attrs={'class': 'w-full p-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500'}),
            'description': forms.Textarea(attrs={'class': 'w-full p-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500', 'rows': 4}),
            'post_type': forms.Select(attrs={'class': 'w-full p-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500'}),
            'file': forms.ClearableFileInput(attrs={'class': 'w-full p-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500'}),
        }
