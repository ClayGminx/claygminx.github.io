/* 共享书籍类名 */
const SHARED_BOOK = 'SharedBook';

/* 书籍属性 */
const NUMBER      = 'number';     // 书号
const NAME        = 'name';       // 书名
const AUTHOR      = 'author';     // 作者
const OWNER       = 'owner';      // 书主
const BORROWER    = 'borrower';   // 借阅人
const BORROWED_AT = 'borrowedAt'; // 借阅时间
const RETURN_AT   = 'returnAt';   // 归还时间
const ACTIVE      = 'active';     // 是否上架

/* 日期格式 */
const DATE_FORMAT = 'yyyy/MM/dd';

/* 增加日期格式化的功能，可以格式为yyyy-MM-dd hh:mm:ss的格式 */
Date.prototype.format = function(fmt) {
    var o = {
        "M+": this.getMonth() + 1,
        "d+": this.getDate(),
        "h+": this.getHours(),
        "m+": this.getMinutes(),
        "s+": this.getSeconds(),
        "q+": Math.floor((this.getMonth() + 3) / 3),
        "S" : this.getMilliseconds()
    };
    if (/(y+)/.test(fmt)) {
        fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    }
    for (var k in o) {
        if (new RegExp("(" + k + ")").test(fmt)) {
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length==1)? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
        }
    }
    return fmt;
};

/* 初始化书架 */
$(() => {
    /*
     * modal警告框
     */
    let modalAlert = (message) => {
        $('#messageModal .modal-body').html(message);
        $('#messageModal').modal({
            keyboard: false,
            backdrop: true
        });
    };

    /*
     * 顶部提示
     */
    let topTip = (message) => {
        let id = Number(Math.random().toString().substr(3,36) + Date.now()).toString(36);
        let html = `<div class="alert alert-info" role="alert" id="${id}">${message}</div>`;
        $('#subscribeTips').prepend(html);
        window.setTimeout(() => {// 5秒后自动消失
            $(`#${id}`).remove();
        }, 5000);
    };

    /*
     * 旋转图标
     */
    let loading = (show) => {
        if (show) {
            let html = '<div id="loadingSpinner" class="d-flex justify-content-center" style="height: 100%; position: fixed; width: 100%; top: 0; z-index: 999999; background-color: rgba(0,0,0,0.2); margin: 0; left: 0;"><div class="spinner-border" role="status" style="position: relative; top: 50%"><span class="sr-only">努力加载中……</span></div></div>';
            $('body').append(html);
        } else {
            $('#loadingSpinner').remove();
        }
    };

    /*
     * 查询对象
     */
    const query = new AV.Query(SHARED_BOOK);
    query.equalTo(ACTIVE, true);// 只查询上架的书

    /*
     * 分页
     */
    // 分页对象
    const pagination = {};
    Object.defineProperties(pagination, {
        pageSize: {// 页容量
            value: 20,
            writable: false,
            configurable: false
        },
        numberSize: {// 当前网页最多显示多少个数字a标签用来翻页
            value: 5,
            writable: false,
            configurable: false
        },
        total: {// 总共多少页
            get: () => {return this._total},
            set: (newValue) => {
                this._total = newValue;
                if (newValue > 0 && this._to > 0) {
                    // 总共多少页
                    this._pageCount = Math.ceil(newValue / pagination.pageSize);
                    // 隐藏多余页号标签
                    for (let i = 0, j = this._to; i < pagination.numberSize; i++) {
                        if ((j - 1) % pagination.numberSize == i) {
                            if (j > this._pageCount) {
                                $(`#pagination .pagination-number:eq(${i})`).hide();
                            } else {
                                $(`#pagination .pagination-number:eq(${i})`).show();
                            }
                            j++;
                        } else {
                            $(`#pagination .pagination-number:eq(${i})`).show();
                        }
                    }
                    // 隐藏上一页或下一页
                    if (this._to == 1) {
                        $('#pagination-previous').hide();
                    } else {
                        $('#pagination-previous').show();
                    }
                    if (this._to == this._pageCount) {
                        $('#pagination-next').hide();
                    } else {
                        $('#pagination-next').show();
                    }
                    // 显示分页
                    $('#pagination').show();
                } else {
                    // 没有数据
                    this._pageCount = undefined;
                    $('#pagination').hide();
                }
            }
        },
        current: {// 当前第几页
            get: () => {return this._current},
            set: (newValue) => {
                if (newValue != this._current && newValue > 0) {// 翻页
                    // 若翻到第一页，则隐藏上一页按钮
                    if (newValue == 1) {
                        $('#pagination-previous').hide();
                    } else {
                        $('#pagination-previous').show();
                    }
                    // 若翻到最后一页，则隐藏下一页按钮
                    if (pagination.pageSize * (newValue) >= this._total) {
                        $('#pagination-next').hide();
                    } else {
                        $('#pagination-next').show();
                    }
                    // 激活状态
                    $('#pagination .pagination-number').removeClass('active').css('pointer-events', 'auto');
                    $(`#pagination .pagination-number:eq(${newValue%pagination.numberSize-1})`).addClass('active').css('pointer-events', 'none');
                    // 改变页码
                    if (newValue > this._current && newValue % pagination.numberSize == 1) {
                        for (let i = 0, j = newValue; i < pagination.numberSize; i++) {
                            if ((j - 1) % pagination.numberSize == i) {
                                $(`#pagination .pagination-number:eq(${i}) a`).html(j);
                                if (j > this._pageCount) {
                                    $(`#pagination .pagination-number:eq(${i})`).hide();
                                } else {
                                    $(`#pagination .pagination-number:eq(${i})`).show();
                                }
                                j++;
                            } else {
                                $(`#pagination .pagination-number:eq(${i})`).show();
                            }
                        }
                    }
                    if (newValue < this._current && newValue % pagination.numberSize == 0) {
                        for (let i = newValue; i > newValue - pagination.numberSize; i--) {
                            $(`#pagination .pagination-number:eq(${(i-1)%pagination.numberSize}) a`).html(i);
                        }
                    }
                }
                if (newValue > 0 && this._total > 0) {
                    $('#pagination').show();
                } else {
                    $('#pagination').hide();
                }
                this._current = newValue;
            }
        },
        to: {// 翻到第几页
            get: () => {return this._to},
            set: (newValue) => {
                this._to = newValue;
            }
        }
    });
    // 上一页
    $('#pagination-previous').on('click', (e) => {
        pagination.to = pagination.current - 1;
        loadBookshelf(query);
    });
    // 下一页
    $('#pagination-next').on('click', (e) => {
        pagination.to = pagination.current + 1;
        loadBookshelf(query);
    });
    // 页码
    $('#pagination .pagination-number').on('click', (e) => {
        pagination.to = parseInt(e.target.innerHTML.trim());
        loadBookshelf(query);
    });

    // 用于加载书架的函数
    let loadBookshelf = (q, callback) => {
        // show loading
        loading(true);

        // 分页
        let pageSize = pagination.pageSize;
        let currentPage = pagination.to;
        q.limit(pageSize);
        q.skip(pageSize * (currentPage - 1));
        // 按照书号排序
        q.ascending(NUMBER);

        q.count().then((count) => {
            pagination.total = count;
            if (count > 0) {
                q.find().then((books) => {
                    let allTrs = '';
                    for (let i = 0; i < books.length; i++) {
                        let book = books[i];
                        let objectId = book.id;
                        let number = book.get(NUMBER)? book.get(NUMBER) : '--';
                        let name = book.get(NAME)? book.get(NAME).trim() : '--';
                        let author = book.get(AUTHOR)? book.get(AUTHOR).trim(): '--';
                        let owner = book.get(OWNER)? book.get(OWNER).trim(): '--';
                        let createdTime = book.createdAt.format(DATE_FORMAT);
                        let borrower = book.get(BORROWER)? book.get(BORROWER).trim() : '--';
                        let borrowTime = book.get(BORROWED_AT)? book.get(BORROWED_AT).format(DATE_FORMAT) : '--';
                        let returnTime = book.get(RETURN_AT)? book.get(RETURN_AT).format(DATE_FORMAT) : '--';
                        let borrowStatus = '<span class="badge badge-pill badge-danger">已借</span>';
                        if (borrower == '--') {
                            borrowStatus = '<span class="badge badge-pill badge-success">可借</span>';
                        }
                        let html = `<tr object-id="${objectId}"><td>${number}</td><td>${borrowStatus}</td><td>${name}</td><td>${author}</td><td>${owner}</td><td>${createdTime}</td><td>${borrower}</td><td>${borrowTime}</td><td>${returnTime}</td></tr>`;
                        allTrs += html;
                    }
                    $('#bookList > table > tbody').html(allTrs);
                    pagination.current = pagination.to;
                }, (error) => {
                    console.debug(error);
                    modalAlert('查询失败！');
                }).then((result) => {
                    loading(false);
                    if (callback instanceof Function) { callback(); }
                });
            } else {
                console.debug('NO DATA');
                pagination.current = undefined;
                $('#bookList > table > tbody').html('');
                loading(false);
                if (callback instanceof Function) { callback(); }
            }
        }, (error) => {
            console.debug(error);
            loading(false);
            modalAlert('查询失败！');
            if (callback instanceof Function) { callback(); }
        });
    };

    /*
     * 首次加载
     */
    pagination.to = 1;
    loadBookshelf(query);

    /*
     * 查找图书
     */
    $('#searchModal').on('shown.bs.modal', () => {
        $('#searchModal input[type="search"]').focus();
    });
    $('#searchButton').on('click', (e) => {
        let text = $('#searchModal input[type="search"]').val();
        if (text == '') {
            // 删除到查找全部
            for (let key in query._where) {// 清空查找条件
                delete query._where[key];
            }
            query.equalTo(ACTIVE, true);
            pagination.to = 1;
            loadBookshelf(query, () => {
                $('#searchModal').modal('hide');
            });
        } else {
            // 书名
            let bookNameQuery = new AV.Query(SHARED_BOOK);
            bookNameQuery.contains(NAME, text);
            // 作者
            let bookAuthorQuery = new AV.Query(SHARED_BOOK);
            bookAuthorQuery.contains(AUTHOR, text);
            // 书主
            let bookOwnerQuery = new AV.Query(SHARED_BOOK);
            bookOwnerQuery.contains(OWNER, text);
            // 或
            let searchQuery = AV.Query.or(bookNameQuery, bookAuthorQuery, bookOwnerQuery);
            searchQuery.equalTo(ACTIVE, true);
            query._where = searchQuery._where;
            pagination.to = 1;
            // 查找
            loadBookshelf(query, () => {
                $('#searchModal').modal('hide');
            });
        }
    });

    // 订阅
    query.subscribe().then((liveQuery) => {

        // 上架新书时
        liveQuery.on('create', (book) => {
            console.debug('create event');
            loadBookshelf(query);
            let owner = book.get(OWNER);
            let name = book.get(NAME);
            let message = `${owner}上架了《${name}》`;
            topTip(message);
        });

        // 更新一本书时
        liveQuery.on('update', (book, updatedKeys) => {
            console.debug('update event');
            console.log(updatedKeys);
            console.log(book);
            loadBookshelf(query);
            let number = book.get(NUMBER);
            let message = `书号为${number}的书籍信息被更新`;
            topTip(message);
        });

        // 更新一本书以至于满足查询条件时
        liveQuery.on('enter', (book, updatedKeys) => {
            console.debug('enter event');
            loadBookshelf(query);
            let message = null;
            if (updatedKeys.includes(ACTIVE)) {
                let owner = book.get(OWNER);
                let name = book.get(NAME);
                message = `${owner}上架了《${name}》`;
            } else {
                let number = book.get(NUMBER);
                message = `书号为${number}的书籍信息被更新`;
            }
            topTip(message);
        });

        // 更新一本书以至于不满足查询条件时
        liveQuery.on('leave', (book, updatedKeys) => {
            console.debug('leave event');
            loadBookshelf(query);
            let message = null;
            if (book.get(ACTIVE)) {
                let number = book.get(NUMBER);
                message = `书号为${number}的书籍信息被更新`;
            } else {
                let owner = book.get(OWNER);
                let name = book.get(NAME);
                message = `${owner}下架了《${name}》`;
            }
            topTip(message);
        });

        // 下架一本书时
        liveQuery.on('delete', (book) => {
            console.debug('delete event');
            loadBookshelf(query);
            let owner = book.get(OWNER);
            let name = book.get(NAME);
            let message = `${owner}下架了《${name}》`;
            topTip(message);
        });
    }, (error) => {
        console.debug(error);
        modalAlert('订阅异常！');
    });
});