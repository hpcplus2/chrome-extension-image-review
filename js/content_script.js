const COMMAND_TYPE = {
    TRAVELS: 'travels',
};

const Utils = {
    formatByteUnit: (bytes) => {
        const unitArr = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
        bytes = parseFloat(bytes);
        let index = Math.floor(Math.log(parseFloat(bytes)) / Math.log(1024));
        const size = (bytes / Math.pow(1024, index)).toFixed(2);
        return size + unitArr[index];
    },
    getFileName: (url) => {
        if (!url) { return ''; }
        let lastStr = url.split('/');
        lastStr = lastStr[lastStr.length - 1];
        return lastStr.split('?')[0];
    },
}

const createDisplayBox = (imgUrl, size = {}, originSize = {}, fileName = 'pic.jpg', blobSize = '未知') => {
    const tpl = `
        <p class="u-tlt">图片审查工具</p>
        <div class="m-content">
            <p class="u-sub-tlt">原始尺寸</p>
            <p class="u-data">${originSize.naturalWidth}&nbsp;x&nbsp;${originSize.naturalHeight}</p>
        </div>
        <div class="m-content">
            <p class="u-sub-tlt">当前尺寸</p>
            <p class="u-data">${size.width}&nbsp;x&nbsp;${size.height}</p>
        </div>
        <div class="m-content">
            <p class="u-sub-tlt">图片体积</p>
            <p class="u-data">${blobSize}</p>
        </div>
        <div class="m-content">
            <a href="javascript:;" class="u-btn J_hpcherry_copy" data-url="${imgUrl}">复制链接</a>
            <a href="${imgUrl}" class="u-btn" download="${fileName}">下载图片</a>
        </div>
    `;
    if (!$('.hpcherry-box').length) {
        const dom = document.createElement('div');
        dom.className = 'hpcherry-box';
        $(dom).html(tpl);
        document.body.appendChild(dom);
    } else {
        $('.hpcherry-box').html(tpl);
    }
}

const removeListens = () => {
    const $container = $('.hpcherry');

    $container.off('click', 'img');

    $container.off('click', '.J_hpcherry_copy');

    $container.off('click', '.J_hpcherry_download');
}

const listens = () => {
    const $container = $('.hpcherry');

    $container.on('click', 'img', function() {
        const target = $(this);
        const imageUrl = this.src;
        const width = target.width();
        const height = target.height();
        const naturalWidth = this.naturalWidth;
        const naturalHeight = this.naturalHeight;

        var blob = null;
        var xhr = new XMLHttpRequest(); 
        xhr.open('GET', imageUrl, true);
        xhr.responseType = 'blob';
        xhr.onload = () => {
            blob = xhr.response;
            createDisplayBox(
                imageUrl,
                { width, height }, 
                { naturalWidth, naturalHeight }, 
                Utils.getFileName(imageUrl),
                Utils.formatByteUnit(blob.size));
        }
        xhr.send();
        return false;
    })

    $container.on('click', '.J_hpcherry_copy', function() {
        const copyText = $(this).attr('data-url');

        const input = document.createElement('input');
        document.body.appendChild(input);
        input.setAttribute('value', copyText);
        input.select();
        if (document.execCommand('cut')) {
            document.execCommand('cut');
        }
        document.body.removeChild(input);
    })
}

const mark = () => {
    $('body').addClass('hpcherry');

    listens();
}

const reset = () => {
    removeListens();

    $('.hpcherry-box').remove();

    $('body').removeClass('hpcherry');
}

const launch = () => {
    if ($('body').hasClass('hpcherry')) {
        reset();
    } else {
        mark();
    }
}

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request && request.type === COMMAND_TYPE.TRAVELS) {
            launch();
        }
    }
);
