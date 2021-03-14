// 共享书籍类名
const SHARED_BOOK = 'SharedBook';

// Bookshelf类
const Book = AV.Object.extend(SHARED_BOOK);

// 书籍属性
const NUMBER = 'number';
const NAME = 'name';
const AUTHOR = 'author';
const OWNER = 'owner';
const BORROWER = 'borrower';
const BORROWED_AT = 'borrowedAt';
const RETURN_AT = 'returnAt';
const ACTIVE = 'active';

// 操作
const BORROW = 'borrow';
const RETURN = 'return';
const ADD = 'add';
const REMOVE = 'remove';
const UPDATE = 'update';

// 当前用户
window.currentUser = null;

// 是否提交登录（防止表单重复提交）
window.loginSubmitted = false;

// modal
function modalAlert(message) {
    $('#messageModal .modal-body').html(message);
    $('#messageModal').modal({
        keyboard: false,
        backdrop: true
    });
}

// 登录
function login() {
    if (loginSubmitted) return;
    loginSubmitted = true;
    let username = $('#username').val().trim();
    let password = $('#password').val().trim();
    if (!username) {
        loginSubmitted = false;
        modalAlert('用户名必填！');
        return;
    }
    if (!password) {
        loginSubmitted = false;
        modalAlert('密码必填！');
        return;
    }
    AV.User.logIn(username, password).then((user) => {
        currentUser = user;
        $('#currentUser').html(currentUser.getUsername());
        $('#loginDiv').hide();
        $('#operationDiv').show();
        $('#username').val('');
        $('#password').val('');
        loginSubmitted = false;
    }, (error) => {
        loginSubmitted = false;
        currentUser = null;
        console.debug(error);
        modalAlert('登录失败！');
    });
}

// 断言是否已经登录
function assertLogin() {
    let _currentUser = AV.User.current();
    if (currentUser != _currentUser) {
        if (_currentUser) {
            $('#currentUser').html(_currentUser.getUsername());
            $('#operationDiv').show();
            $('#loginDiv').hide();
        } else {
            $('#operationDiv').hide();
            $('#loginDiv').show();
        }
        currentUser = _currentUser;
    } else if (_currentUser == null) {
        $('#operationDiv').hide();
        $('#loginDiv').show();
    } else {
        $('#operationDiv').show();
        $('#loginDiv').hide();
    }
}

// 登出
function logout() {
    AV.User.logOut();
    loginSubmitted = false;
}

// 每隔一段时间断言登录
window.setInterval(() => {
    assertLogin();
}, 100);

// 首次加载
$(() => {
    // 防止表单重复提交
    let borrowSubmitted = false;
    let returnSubmitted = false;
    let addSubmitted = false;
    let removeSubmitted = false;
    let updateSubmitted = false;

    // input选择器
    let inputSelector = (op, name) => {
        return $(`#${op} input[name="${name}"]`);
    };

    let getInputValue = (op, name) => {
        return inputSelector(op, name).val();
    };
    
    $('#loginButton').on('click', () => {
        login();
    });

    $('#borrowButton').on('click', () => {
        // 防止表单重复提交
        if (borrowSubmitted) return;
        borrowSubmitted = true;

        // 检查输入
        let number = parseInt(getInputValue(BORROW, NUMBER).trim());
        let borrower = getInputValue(BORROW, BORROWER).trim();
        if (!number) {//NaN or 0
            modalAlert('书籍序号应是正整数！');
            borrowSubmitted = false;
            return;
        }
        if (!borrower) {
            modalAlert('请输入姓名！');
            borrowSubmitted = false;
            return;
        }

        // 先查询书籍信息
        let numberQuery = new AV.Query(SHARED_BOOK);
        numberQuery.equalTo(NUMBER, number);
        let activeQuery = new AV.Query(SHARED_BOOK);        
        activeQuery.equalTo(ACTIVE, true);
        let query = AV.Query.and(activeQuery, numberQuery);
        query.find().then((books) => {
            if (books.length > 0) {
                let book = books[0];
                console.debug(book);
                if (book.get(BORROWER)) {
                    modalAlert('此书已经被' + book.get(BORROWER) + '借走了！');
                    borrowSubmitted = false;
                } else {
                    // 存在此书号，开始借书
                    let borrowDatetime = new Date();
                    let returnDatetime = new Date(borrowDatetime.getTime() + 2 * 30 * 86400 * 1000);// 还书日期是两个月后
                    book.set(BORROWED_AT, borrowDatetime);
                    book.set(RETURN_AT, returnDatetime);
                    book.set(BORROWER, borrower);
                    book.save().then((result) => {
                        console.debug(result);
                        modalAlert('借书成功');
                        borrowSubmitted = false;
                    }, (error) => {
                        console.debug(error);
                        modalAlert('借书错误！');
                        borrowSubmitted = false;
                    });
                }
            } else {
                modalAlert('书号[' + number + ']不存在！');
                borrowSubmitted = false;
            }
        }, (error) => {
            console.debug(error);
            modalAlert('查询错误！');
            borrowSubmitted = false;
        });
    });

    $('#returnButton').on('click', () => {
        // 防止表单重复提交
        if (returnSubmitted) return;
        returnSubmitted = true;

        // 检查输入
        let number = parseInt(getInputValue(RETURN, NUMBER).trim());
        if (!number) {//NaN or 0
            modalAlert('书籍序号应是正整数！');
            returnSubmitted = false;
            return;
        }

        // 先查询书籍信息
        let numberQuery = new AV.Query(SHARED_BOOK);
        numberQuery.equalTo(NUMBER, number);
        let activeQuery = new AV.Query(SHARED_BOOK);        
        activeQuery.equalTo(ACTIVE, true);
        let query = AV.Query.and(activeQuery, numberQuery);
        query.find().then((books) => {
            if (books.length > 0) {
                let book = books[0];
                console.debug(book);
                if (book.get(BORROWER)) {
                    // 此书号存在，开始还书
                    book.set(BORROWED_AT, null);
                    book.set(RETURN_AT, null);
                    book.set(BORROWER, null);
                    book.save().then((result) => {
                        console.debug(result);
                        modalAlert('还书成功');
                        returnSubmitted = false;
                    }, (error) => {
                        console.debug(error);
                        modalAlert('还书错误！');
                        returnSubmitted = false;
                    });
                } else {
                    modalAlert('此书尚未被借走！');
                    returnSubmitted = false;
                }
            } else {
                modalAlert('书号[' + number + ']不存在！');
                returnSubmitted = false;
            }
        }, (error) => {
            console.debug(error);
            modalAlert('查询错误！');
            returnSubmitted = false;
        });
    });

    $('#addButton').on('click', () => {
        if (addSubmitted) return;
        addSubmitted = true;

        let name = getInputValue(ADD, NAME).trim();
        let author = getInputValue(ADD, AUTHOR).trim();
        let owner = getInputValue(ADD, OWNER).trim();

        if (!name) {
            modalAlert('书名必填！');
            addSubmitted = false;
            return;
        }
        if (!owner) {
            modalAlert('书主必填！');
            addSubmitted = false;
            return;
        }

        let book = new Book();
        book.set(NAME, name);
        book.set(AUTHOR, author);
        book.set(OWNER, owner);
        book.set(ACTIVE, true);
        book.save().then((result) => {
            // 上架成功
            console.debug(result);
            modalAlert('上架成功');
            addSubmitted = false;
        }, (error) => {
            console.debug(error);
            modalAlert('上架失败！');
            addSubmitted = false;
        });
    });

    $('#removeButton').on('click', () => {
        if (removeSubmitted) return;
        removeSubmitted = true;

        
        let number = parseInt(getInputValue(REMOVE, NUMBER).trim());
        if (!number) {//NaN or 0
            modalAlert('书籍序号应是正整数！');
            removeSubmitted = false;
            return;
        }

        let numberQuery = new AV.Query(SHARED_BOOK);
        numberQuery.equalTo(NUMBER, number);
        let activeQuery = new AV.Query(SHARED_BOOK);        
        activeQuery.equalTo(ACTIVE, true);
        let query = AV.Query.and(activeQuery, numberQuery);
        query.find().then((books) => {
            if (books.length > 0) {
                let book = books[0];
                console.debug(book);
                book.set(ACTIVE, false);
                book.save().then((result) => {
                    console.debug(result);
                    modalAlert('下架成功');
                    removeSubmitted = false;
                }, (error) => {
                    console.debug(error);
                    modalAlert('下架错误！');
                    removeSubmitted = false;
                });
            } else {
                modalAlert('书号[' + number + ']不存在！');
                removeSubmitted = false;
            }
        }, (error) => {
            console.debug(error);
            modalAlert('查询错误！');
            removeSubmitted = false;
        });
    });

    $('#updateButton').on('click', () => {
        if (updateSubmitted) return;
        updateSubmitted = true;

        let number = getInputValue(UPDATE, NUMBER).trim();
        let name = getInputValue(UPDATE, NAME).trim();
        let author = getInputValue(UPDATE, AUTHOR).trim();
        let owner = getInputValue(UPDATE, OWNER).trim();
        number = parseInt(number);

        if (!number) {//NaN or 0
            modalAlert('书籍序号应是正整数！');
            updateSubmitted = false;
            return;
        }
        if (!name) {
            modalAlert('书名必填！');
            updateSubmitted = false;
            return;
        }
        if (!owner) {
            modalAlert('书主必填！');
            updateSubmitted = false;
            return;
        }

        let numberQuery = new AV.Query(SHARED_BOOK);
        numberQuery.equalTo(NUMBER, number);
        let activeQuery = new AV.Query(SHARED_BOOK);        
        activeQuery.equalTo(ACTIVE, true);
        let query = AV.Query.and(activeQuery, numberQuery);
        query.find().then((books) => {
            if (books.length > 0) {
                let book = books[0];
                console.debug(book);
                book.set(NAME, name);
                book.set(AUTHOR, author);
                book.set(OWNER, owner);
                book.save().then((result) => {
                    console.debug(result);
                    modalAlert('更新成功');
                    updateSubmitted = false;
                }, (error) => {
                    console.debug(error);
                    modalAlert('更新错误！');
                    updateSubmitted = false;
                });
            } else {
                modalAlert('没有这本书！');
                updateSubmitted = false;
            }
        }, (error) => {
            console.debug(error);
            modalAlert('查询错误！');
            updateSubmitted = false;
        });
    });
});