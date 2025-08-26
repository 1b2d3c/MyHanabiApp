document.addEventListener('DOMContentLoaded', () => {
    const postButton = document.getElementById('post-menu-button');
    const postMenu = document.getElementById('post-menu');

    // ボタンをクリックしたらメニューの表示を切り替える
    postButton.addEventListener('click', (event) => {
        event.stopPropagation(); // クリックイベントがbodyまで伝播するのを防ぐ
        postMenu.classList.toggle('active');
    });

    // メニューの外側をクリックしたらメニューを閉じる
    document.body.addEventListener('click', (event) => {
        if (!postMenu.contains(event.target) && !postButton.contains(event.target)) {
            postMenu.classList.remove('active');
        }
    });

    // メニュー内のクリックを停止する
    postMenu.addEventListener('click', (event) => {
        event.stopPropagation();
    });
});
