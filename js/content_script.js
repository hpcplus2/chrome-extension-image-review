let toolBoxInstance = null;

const constants = {
    prefix: 'hpcherry',

    /*
     * chrome extension request type
     */
    COMMAND_TYPE: {
        TRAVELS: 'travels',
    },

    /** 
     * element selector name
     */
    selector: {
        Container: '.hpcherry',
        ToolBox: '.hpcherry-box',
        BoxContent: '.J_hpcherry_boxContent',
        COPY: '.J_hpcherry_copy',
        CLEAR: '.J_hpcherry_clear',
        SETTING: '.J_hpcherry_setting',
        ReviewPage: '.J_hpcherry_reviewPage',
        WARNING: '.J_hpcherry_warning',
    },

    MAX_OFFSET_PROPORTION: 1,

    MAX_OFFSET_VALUE: 0,
}

const Utils = {
    /** 
     * byte unit format function
     * @params {number} bytes 
     */
    formatByteUnit: (bytes) => {
        const unitArr = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
        bytes = parseFloat(bytes);
        let index = Math.floor(Math.log(parseFloat(bytes)) / Math.log(1024));
        const size = (bytes / Math.pow(1024, index)).toFixed(2);
        return size + unitArr[index];
    },
    /** 
     * get the file name by parse url 
     */
    getFileName: (url) => {
        if (!url) { return ''; }
        let lastStr = url.split('/');
        lastStr = lastStr[lastStr.length - 1];
        return lastStr.split('?')[0];
    },

    /** 
     * remove class selector prefix
     */
    getClassName: (selector) => {
        return selector ? selector.replace('.', '') : '';
    },

    /** 
     * calculate width and height proportion
     */
    calcProportion: (w, h) => {
        return Math.round(w / h * 10000) / 100;
    },
}

class ReviewToolsBox {
    /**
     * review tool's mode
     */
    static ReviewMode = {
        SINGLE: 1,      // review a single image
        ALL: 2          // review all images on the page
    }

    /**  
     * review tools box display type
     */
    static TPL_TYPE = {
        INIT: 0,        // init page
        SINGLE: 1,      // single image information display page
        ALL: 2,         // review result information display page (for all images)
    }

    /** 
     * review page error type
     */
    static WARNING_TYPE = {
        PROPORTION: 1,   // proportion error
        SIZE: 2,         // size error
    }

    reviewMode = ReviewToolsBox.ReviewMode.SINGLE;

    proportionErrorList = [];

    sizeErrorList = [];

    /** 
     * init image review tool box
     */
    init = () => {
        const tpl = this.renderTpl(ReviewToolsBox.TPL_TYPE.INIT)(true);
        const dom = document.createElement('div');
        dom.className = Utils.getClassName(constants.selector.ToolBox);
        $(dom).html(tpl);
        document.body.appendChild(dom);

        this.listens();
    }

    /** 
     * reset image review tool box
     */
    reset = () => {
        this.clearWarning();

        if (this.reviewMode !== ReviewToolsBox.ReviewMode.SINGLE) {
            this.reviewMode = ReviewToolsBox.ReviewMode.SINGLE;
        }
        const tpl = this.renderTpl(ReviewToolsBox.TPL_TYPE.INIT)();
        this.changeBoxContent(tpl);
    }
    
     /** 
     * destory image review tool box
     */
    remove = () => {
        this.clearWarning();

        this.removeAllListeners();

        $(constants.selector.ToolBox).remove();
    }

    /**
     * remove the warning wrap of images
     */
    clearWarning = () => {
        const $imgs = $(`${constants.selector.WARNING} img`);
        if (!!$imgs.length) {
            $imgs.unwrap();
            this.proportionErrorList = [];
            this.sizeErrorList = [];
        }
    }

    /** 
     * listen for click events from review tools box
     */
    listens = () => {
        const $container = $(constants.selector.Container);
        const self = this;
        $container.on('click', 'img', function() {
            if (self.reviewMode !== ReviewToolsBox.ReviewMode.SINGLE) return

            const target = $(this);
            const imageUrl = this.src;
            const width = target.width();
            const height = target.height();
            const naturalWidth = this.naturalWidth;
            const naturalHeight = this.naturalHeight;

            let blob = null;
            let xhr = new XMLHttpRequest(); 
            xhr.open('GET', imageUrl, true);
            xhr.responseType = 'blob';
            xhr.onload = () => {
                blob = xhr.response;
                self.singleImgDetail(
                    imageUrl,
                    { width, height }, 
                    { naturalWidth, naturalHeight }, 
                    Utils.getFileName(imageUrl),
                    Utils.formatByteUnit(blob.size));
            }
            xhr.send();
            return false;
        })

        $container.on('click', constants.selector.COPY, function() {
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

        $container.on('click', constants.selector.CLEAR, function() {
            self.reset();
        })

        $container.on('click', constants.selector.SETTING, function() {
            // TODO jump to option page
            console.log('跳转配置页面')
        })

        $container.on('click', constants.selector.ReviewPage, function() {
            self.reviewMode = ReviewToolsBox.ReviewMode.ALL;
            self.reviewPage();
        })
    }

    removeAllListeners = () => {
        $(constants.selector.Container).off('click');
    }

    changeBoxContent = (tpl) => {
        $(constants.selector.BoxContent).empty().html(tpl);
    }

    /** 
     * display single image detail info
     */
    singleImgDetail = (imgUrl, size = {}, originSize = {}, fileName = 'pic.jpg', blobSize = '未知') => {
        const tpl = this.renderTpl(ReviewToolsBox.TPL_TYPE.SINGLE)(imgUrl, size, originSize, fileName, blobSize);
        this.changeBoxContent(tpl);
    }

    /**  
     * check all images on the page
     */
    reviewPage = () => {
        this.proportionErrorList = [];
        this.sizeErrorList = [];
        $(`${constants.selector.Container} img`).each((_i, _img) => {
            const $img = $(_img);
            const width = $img.width();
            const height = $img.height();
            const naturalWidth = _img.naturalWidth;
            const naturalHeight = _img.naturalHeight;
            // exclude unloaded images
            if (!!width && !!height && !!naturalWidth && !!naturalHeight && naturalWidth !== 1 && naturalHeight !== 1) {
                if (!this.judgeProportion(width, height, naturalWidth, naturalHeight)) {
                    this.proportionErrorList.push($img);
                    $img.wrap(this.warningWrap(ReviewToolsBox.WARNING_TYPE.PROPORTION));
                } else if (!this.judgeSize(width, height, naturalWidth, naturalHeight)) {
                    this.sizeErrorList.push($img);
                    $img.wrap(this.warningWrap(ReviewToolsBox.WARNING_TYPE.SIZE));
                } else {
                    // nothing
                }
            }
        });
        const tpl = this.renderTpl(ReviewToolsBox.TPL_TYPE.ALL)(this.proportionErrorList.length, this.sizeErrorList.length);
        this.changeBoxContent(tpl);
    }

    /*
     * @params {TPL_TYPE} tplType
     * @return {Function} generate html function
     */
    renderTpl = (tplType) => {
        const classPrefix = constants.prefix;
        const selectors = constants.selector;
        let renderFunction;
        switch (tplType) {
            case ReviewToolsBox.TPL_TYPE.SINGLE:
                renderFunction = (imgUrl, size, originSize, fileName, blobSize) => {
                    const tpl = `
                        <div class="m-${classPrefix}-block">
                            <p class="u-${classPrefix}-subTlt">原始尺寸</p>
                            <p class="u-${classPrefix}-data">${originSize.naturalWidth}&nbsp;x&nbsp;${originSize.naturalHeight}</p>
                        </div>
                        <div class="m-${classPrefix}-block">
                            <p class="u-${classPrefix}-subTlt">当前尺寸</p>
                            <p class="u-${classPrefix}-data">${size.width}&nbsp;x&nbsp;${size.height}</p>
                        </div>
                        <div class="m-${classPrefix}-block">
                            <p class="u-${classPrefix}-subTlt">图片体积</p>
                            <p class="u-${classPrefix}-data">${blobSize}</p>
                        </div>
                        <div class="m-${classPrefix}-block">
                            <a href="javascript:;" class="u-${classPrefix}-btn ${Utils.getClassName(selectors.COPY)}" data-url="${imgUrl}">复制链接</a>
                            <a href="${imgUrl}" class="u-${classPrefix}-btn" download="${fileName}" target="_blank">下载图片</a>
                        </div>
                        <a href="javascript:;" class="u-${classPrefix}-clear ${Utils.getClassName(selectors.CLEAR)}"></a>
                    `;
                    return tpl;
                }
                break;
            case ReviewToolsBox.TPL_TYPE.ALL:
                renderFunction = (n1 = 0, n2 = 0) => {
                    const tpl = `
                        <div class="m-${classPrefix}-block">
                            <p class="u-${classPrefix}-subTlt">页面审查结果</p>
                        </div>
                        <div class="m-${classPrefix}-resultBlock">
                            <p class="u-${classPrefix}-result">比例错误: ${n1}张图片</p>
                            <p class="u-${classPrefix}-result">宽高错误: ${n2}张图片</p>
                        </div>
                        <div class="m-${classPrefix}-block">
                            <p class="u-${classPrefix}-tips">*注：错误图片会蒙上一层遮罩</p>
                        </div>
                        <a href="javascript:;" class="u-${classPrefix}-clear ${Utils.getClassName(selectors.CLEAR)}"></a>
                    `;
                    return tpl;
                }
                break;
            case ReviewToolsBox.TPL_TYPE.INIT:
            default:
                renderFunction = (initStruct = false) => {
                    const tpl = `
                        ${initStruct ? 
                            `<div class="u-${classPrefix}-tlt">图片审查工具</div>
                                <div class="m-${classPrefix}-content ${Utils.getClassName(selectors.BoxContent)}">
                            ` 
                            : ''
                        }
                            <div class="m-${classPrefix}-block">
                                <p class="u-${classPrefix}-placeholder">图片审查功能已开启，<span class="f-${classPrefix}-hightlight">点击页面内的图片</span>可获得图片基本信息(宽高、体积)</p>
                            </div>
                            <div class="m-${classPrefix}-block">
                                <button class="u-${classPrefix}-reviewBtn ${Utils.getClassName(selectors.ReviewPage)}">全局审查</button>
                            </div>
                            <a class="u-${classPrefix}-setting ${Utils.getClassName(selectors.SETTING)}">配置</a>
                        ${initStruct ? `</div>` : ''}
                    `;
                    return tpl;
                }
        }
        return renderFunction;
    }

    /*
     * @params {WARNING_TYPE} warningType
     * @return {string} warning wrap element
     */
    warningWrap = (warningType) => {
        const classPrefix = constants.prefix;
        const selectors = constants.selector;
        let errorClass = '';
        switch (warningType) {
            case ReviewToolsBox.WARNING_TYPE.PROPORTION:
                errorClass = 'f-proportion-error';
                break;
            case ReviewToolsBox.WARNING_TYPE.SIZE:
                errorClass = 'f-size-error';
                break;
            default:
        }
        const tpl = `<div class="m-${classPrefix}-warning-wrap ${errorClass} ${Utils.getClassName(selectors.WARNING)}"></div>`
        return tpl;
    }

    /**
     * @params {number} width
     * @params {number} height
     * @params {number} naturalWidth
     * @params {number} naturalHeight
     * @return {boolean} whether the image's proportion is right
     */
    judgeProportion = (width, height, naturalWidth, naturalHeight) => {
        const displayProportion = Utils.calcProportion(width, height);
        const naturalProportion = Utils.calcProportion(naturalWidth, naturalHeight);
        const leftProportion =  Math.abs(Number(displayProportion - naturalProportion).toFixed(2));
        return !(leftProportion > constants.MAX_OFFSET_PROPORTION);
    }

    /**
     * @params {number} width
     * @params {number} height
     * @params {number} naturalWidth
     * @params {number} naturalHeight
     * @return {boolean} whether the deviation of the width and height of the image is within the expected
     */
    judgeSize = (width, height, naturalWidth, naturalHeight) => {
        const leftWidth = Math.ceil(Math.abs(naturalWidth - width));
        const leftHeight = Math.ceil(Math.abs(naturalHeight - height));
        return !(leftWidth > constants.MAX_OFFSET_VALUE || leftHeight > constants.MAX_OFFSET_VALUE);
    }
}

const launch = () => {
    $('body').addClass(Utils.getClassName(constants.selector.Container));
    toolBoxInstance = new ReviewToolsBox();
    toolBoxInstance.init();
}

const reset = () => {
    if (toolBoxInstance) {
        toolBoxInstance.remove();
        toolBoxInstance = null;
    }
    $('body').removeClass(Utils.getClassName(constants.selector.Container));
}

chrome.runtime.onMessage.addListener(
    function(request) {
        if (request && request.type === constants.COMMAND_TYPE.TRAVELS) {
            if ($('body').hasClass(Utils.getClassName(constants.selector.Container))) {
                reset();
            } else {
                launch();
            }
        }
    }
);
