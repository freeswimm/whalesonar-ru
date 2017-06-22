$(function () {
    
       
    var whale_sounds = [document.getElementById("whale1")];
    var dolphin_sounds = [document.getElementById("dolphin1"), document.getElementById("dolphin2"), document.getElementById("dolphin3")];
    var orca_sounds = [document.getElementById("orca1"), document.getElementById("orca2")];
   
    
    // фоны для шариков
    var balloon_bg = ['blue-bg', 'green-bg', 'pink-bg', 'yellow-bg', 'orange-bg'];
    
    /* -----ДЕБАГ----- */    
    // режим отладки
    var debug = true;
    // останавливает кита 
    var stop_mode = false;
    var show_only = '';        
    /* ---end дебаг ---*/
        
    // конфигурация steem/golos

    var MODE = 'golos';
    
    // время жизни животного в секундах
    var LIFE_INTERVAL = 15;
    // SP по умолчанию
    var DEFAULT_SP = 10000;
    // время действия всех кук в днях
    var COOKIE_EXPIRES = 90;    
    // черный список по умолчанию
    var BLACK_LIST = 'cheetah';
   
    // предустановки для STEEM / GOLOS
    if(MODE == 'golos'){ 
        steem.config.set('websocket', 'wss://ws.golos.io');
        var DOMAIN = 'https://golos.io/';
    } else {
        var DOMAIN = 'https://steemit.com/';
    }
            
  /* Заполнить значения полей из cookie */
   
    if((Cookies.get('name') !== 'null') && (Cookies.get('name') !== undefined)){
        $('#name').val(Cookies.get('name'));       
    }
    if(Cookies.get('min_sp') !== undefined){
        $('#min_sp').val(Cookies.get('min_sp'));
    } else {
        $('#min_sp').val(DEFAULT_SP);
    }
    if(Cookies.get('black_list') !== undefined){
        BLACK_LIST = Cookies.get('black_list');
        $('#black_list').val(BLACK_LIST);
    } else {
        $('#black_list').val(BLACK_LIST);
    }

    BLACK_LIST = BLACK_LIST.replace(/\s+/g, '').split(',');
    
    // состояние чекбоксов по кукам
    if(Cookies.get('sound_on') === 'on'){
       $('#sound_on').attr('checked', true);
    } else if((Cookies.get('sound_on') === 'off') || (Cookies.get('sound_on') === undefined)){        
         $('#sound_on').attr('checked', false);
    }
    
    if(Cookies.get('balloon_on') === 'on'){
       $('#balloon_on').attr('checked', true);
    } else if((Cookies.get('balloon_on') === 'off') || (Cookies.get('balloon_on') === undefined)){        
         $('#balloon_on').attr('checked', false);
    }
    
    if((Cookies.get('bg_on') === 'on') || (Cookies.get('bg_on') === undefined)){
       $('#bg_on').attr('checked', true);       
       $('body').addClass('bg-image');
    } else if((Cookies.get('bg_on') === 'off')){        
       $('#bg_on').attr('checked', false);
       $('body').addClass('bg-image2');
    }

    /* События  */
    
    // поддержка события oninput
    var input_event = (('oninput' in document)) ? 'input' : 'keyup';
    
    // проверка введенной SP
    $('#min_sp').on(input_event, function(){
        var sp = validate($(this).val());
        Cookies.set('min_sp', $('#min_sp').val(), {expires: COOKIE_EXPIRES});
        $(this).val(sp);
    });
    // запомнить имя пользователя
    $('#name').on(input_event, function(){
        Cookies.set('name', $('#name').val(), {expires: COOKIE_EXPIRES});
    });
    // запомнить черный список
    $('#black_list').on(input_event, function(){        
        Cookies.set('black_list', $('#black_list').val(), {expires: COOKIE_EXPIRES});
        BLACK_LIST = $('#black_list').val().replace(/\s+/g, '').split(',');
    });

    // показать/скрыть фон
    $('#bg_on').on('change', function(){
        $('body').toggleClass('bg-image2');
        $('body').toggleClass('bg-image');
        
        if($('#bg_on').is(':checked')){
            Cookies.set('bg_on', 'on', {expires: COOKIE_EXPIRES});
        } else { 
            Cookies.set('bg_on', 'off', {expires: COOKIE_EXPIRES});
        }    
    });
    // показать/скрыть шары
    $('#balloon_on').on('change', function(){
        
        if($('#balloon_on').is(':checked')){
            $('.switch-balloon').removeClass('hidden');  
            Cookies.set('balloon_on', 'on', {expires: COOKIE_EXPIRES});            
        } else { 
            $('.switch-balloon').addClass('hidden'); 
            Cookies.set('balloon_on', 'off', {expires: COOKIE_EXPIRES});             
        }    
    });
    
    // запомнить состояние звуков
    $('#sound_on').on('change', function(){       
        if($('#sound_on').is(':checked')){
            Cookies.set('sound_on', 'on', {expires: COOKIE_EXPIRES});
        } else { 
            Cookies.set('sound_on', 'off', {expires: COOKIE_EXPIRES});
        }       
    });
    
    // клик по шарику -> открыть пост автора
    $('body').on('click', '.author-link-overlay', function(){
        var link = $(this).data('link');
        if(link !== ''){
            window.open(link);
        }        
    });
    
    // свернуть боковую панель
    $('#minimize').click(function (e) {
        $(this).toggleClass('rotate-180');

        //containerHeight(); // recalculate page height

        $('.settings-box .wrapper').slideToggle(500, function(){$('#minimize').attr('style', 'display: block !important;');});
    });
    
    /* Работа с транзакциями GOLOS/STEEM   */
    steem.api.getDynamicGlobalProperties(function (err, steem_data) {
        if (err === null) {

            steem.api.streamOperations(function (err, operations) {

                if (err === null) {
                    operations.forEach(function (operation) {
                        // если это апвоут и не сущность из блеклиста
                        if ((operation.voter !== undefined) && (BLACK_LIST.indexOf(operation.voter) === -1)) {
                           // _d(operation);
                            // проверить акк голосующего на силу 
                            steem.api.getAccounts([operation.voter], function (err, account) {
                                
                                if ((err === null)) {
                                    //var reputation = steem.formatter.reputation(result[0].reputation);
                                    // получить СГ аккаунта
                                    var SP = getSteemPower(steem_data, account);
                                                                        
                                    if((show_only === '') || (show_only === account[0].name)){  // DEBUG row -> проверка показа кита для отладочного режима
                                        if (SP >= $('#min_sp').val()*1) {

                                            var vote_data = {
                                                voter: account[0].name,
                                                author: operation.author,
                                                permlink: DOMAIN+'@'+operation.author+'/'+operation.permlink,
                                                link: DOMAIN+'@'+account[0].name,
                                                voter_id: 'v'+account[0].id, // убрать возможные точки из id
                                                sp: SP,
                                                ava: getAvatar(account),
                                                weight: operation.weight / 100,
                                                timestart: Math.floor(Date.now() / 1000),
                                                sound: false,
                                                species: '',
                                                gests: account[0].vesting_shares.split(' ')[0]
                                            };
                                            // выпустить кита на экран )
                                            releaseWhale(vote_data);
                                        }
                                    }
                                } else {
                                    console.log('Error! Cant get account:', err);
                                }
                            });
                        }
                    });
                } else {
                    console.log('Error! Cant get stream:', err);
                }
            });
        } else {
            console.log('Error! Cant get global properties:', err);
        }
    });

    // получить СГ аккаунта
    function getSteemPower(steem_data, acc) {
        var movementGlobal = steem_data.total_vesting_shares.split(' ')[0];
        var powerGlobal = steem_data.total_vesting_fund_steem.split(' ')[0];
        var accVests = acc[0].vesting_shares.split(' ')[0];
        return (powerGlobal * (accVests / movementGlobal)).toFixed(3);
    }

    // получить аватар пользователя
    function getAvatar(acc) {
        try {
            if (('json_metadata' in acc[0])) {
                var metadata = $.parseJSON(acc[0].json_metadata);
                if ('profile' in metadata) {
                    if ('profile_image' in metadata.profile) {
                        return metadata.profile.profile_image;
                    }
                }
            }
        } catch (e) {
            console.log('json parse error');
            return false;
        }
        return false;
    }

    // вывести животное на экран с характерным звуком
    function releaseWhale(whale_data) {
        
        // определить условный тип голосующего
        whale_data = classificate(whale_data);

        _d(whale_data);
        
        // создать животное       
        createWhale(whale_data);
        
        // воспроизвести звук спустя 1 сек
        if (whale_data.sound && $('#sound_on').is(':checked')) {
            setTimeout(function () {               
               whale_data.sound.play();
            }, 1000);
        }
    }
    
    // создать анимацию (кит/орка/дельфин)
    function createWhale(data){
        
        if(data.species === '') { return false;}
        
        var params = {pic: '', alt:'', width: 0};
         
        switch(data.species){
            case 'dolphin':
                params.pic = './img/dolphin.gif';
                params.alt = 'Дельфин';
                params.width = '100px';               
                break;
            case 'orca':
                params.pic = './img/orca.gif';
                params.alt = 'Косатка';
                params.width = '140px';
                break;
            case 'whale':
                params.pic = './img/whale_small.gif';
                params.alt = 'Кит';
                params.width = '220px';
                break;
            case 'big_whale':
                params.pic = './img/whale_small.gif';
                params.alt = 'Синий кит';
                params.width = '280px';
                break;
        }       
        
        // фон балона
        var author_bg = (data.author === $('#name').val()) ? 'burn-bg' : balloon_bg[getRand(0,4)]; 
            
        // если животное с таким же ID еще на странице
        if($('*').is('#'+data.voter_id)) {                        
            
            // изменить имя автора в баллоне
            $('#'+data.voter_id+' .author-balloon span').text(data.author);
            // ссылку на страницы автора
            $('#'+data.voter_id+' .author-link-overlay').data('link', data.permlink);
            // СГ в балоне
            $('#'+data.voter_id+' .sp-title span').text(data.weight+"%");
            // цвет балона 
            $('#'+data.voter_id+' .author-balloon').removeClass().addClass('author-balloon').addClass('is-right-side').addClass(author_bg);
            //$('#'+data.voter_id+' .author-balloon').addClass(author_bg);
        } else {                                    
             
            // убрать животное через промежуток времени LIFE_INTERVAL
            var timeoutID = setTimeout(function(){
                
                if(!stop_mode){ // DEBUG row -> не удалять стили в режиме stop_mode
                    $('#'+data.voter_id).remove();
                
                    // удалить кейфрейм с поведением
                    $('#keyframe_'+data.voter_id).remove();
                }
                
            }, LIFE_INTERVAL*1000);
            
            
            if(!stop_mode){ // DEBUG row -> остановить кита
                // добавить кейфрейм с поведением для животного
                $("<style id='keyframe_"+data.voter_id+"' type='text/css'>"+getLocus(data.voter_id)+" </style>").appendTo("head");
            } else {
                // DEBUG row -> остановить кита
                $("<style id='keyframe_"+data.voter_id+"' type='text/css'> #"+data.voter_id+"{top: 60%; left: 65%;} </style>").appendTo("head");
            }          
            
            // фон тайтла в зав-ти от текущего куратора
            var voter_bg = (data.voter === $('#name').val()) ? 'burn-bg' : 'blue-bg'; 
            var balloon_on = ($('#balloon_on').is(':checked')) ? 'switch-balloon' : 'switch-balloon hidden';
        
            // добавить контейнер с изображением на страницу
            var container = "<div class='creature' id='"+data.voter_id+"' data-clear_id='"+timeoutID+"' style='animation:swim_"+data.voter_id+" "+LIFE_INTERVAL+"s infinite linear;'>\n\
                             <a href='"+data.link+"'  target='_blank'>\n\
                             <img src='"+params.pic+"' alt='"+params.alt+"' width='"+params.width+"'/>\n\
                             </a>\n\
                             <span class='voter-title is-right-side "+voter_bg+" "+balloon_on+"'>"+data.voter+"</span>\n\
                                <svg class='title-curve-line "+balloon_on+"'>\n\
                                  <path fill='none' stroke='#99b' stroke-width='1' d='M30,0 Q30,50 60,60' />\n\
                                </svg>\n\
                             <span class='author-balloon is-right-side "+author_bg+" "+balloon_on+"'><span>"+data.author+"</span></span>\n\
                             <div class='sp-title is-right-side "+balloon_on+"'><span>"+data.weight+"%</span></div>\n\
                             <span class='ballon-nippel "+balloon_on+"'></span>\n\
                             <div class='author-link-overlay "+balloon_on+"' data-link='"+data.permlink+"'></div>\n\
                            </div>";
            $('body').append(container);
        }              
    }
    
    // определить условный тип голосующего (кит/орка/дельфин)
    function classificate(data) {

        // считается по gests
        gests = (data.gests*1) / 1000000;
        
        if ((gests >= 10) && (gests < 100)) {
            data.sound = dolphin_sounds[getRand(0,dolphin_sounds.length-1)];
            data.species = 'dolphin';
        }
        if ((gests >= 100) && (gests < 1000)) {
            data.sound = orca_sounds[getRand(0,orca_sounds.length-1)];
            data.species = 'orca';
        }
        if ((gests >= 1000) && (gests < 3000)) {
            data.sound = whale_sounds[getRand(0,whale_sounds.length-1)];
            data.species = 'whale';
        }
        if (gests > 3000) {
            data.sound = big_whale_sound;
            data.species = 'big_whale';
        } 
        return data;        
    }
    
    // получить траеторию движения животного
    function getLocus(voter_id){
        var top_poin_interval_1 = getRand(15, 50);
        var top_poin_interval_2 = top_poin_interval_1+7;
        // набор траекторий
        var locus_set = [
            // левостороннее движение
            "@keyframes swim_"+voter_id+"{from{left:-5%; top: "+getRand(10, 82)+"%;} to{left:100%; top: "+getRand(10, 82)+"%;}} @-moz-keyframes swim_"+voter_id+"{from{left:-5%; top: "+getRand(10, 82)+"%;} to{left:100%; top: "+getRand(10, 82)+"%;}} @-webkit-keyframes swim_"+voter_id+"{from{left:-5%; top: "+getRand(10, 82)+"%;} to{left:100%; top: "+getRand(10, 82)+"%;}}",
            "@keyframes swim_"+voter_id+"{from{left:-5%; top: "+getRand(5, 20)+"%;} "+top_poin_interval_1+"%{top:0%; transform: rotate(-25deg);} "+top_poin_interval_2+"%{top:-6%; transform: rotate(0deg);} to{left:100%; top: "+getRand(10, 40)+"%;}} @-moz-keyframes swim_"+voter_id+"{from{left:-6%; top: "+getRand(5, 20)+"%;} "+top_poin_interval_1+"{top:0%; transform: rotate(-25deg);} "+top_poin_interval_2+"%{top:-6%; transform: rotate(0deg);} to{left:100%; top: "+getRand(10, 40)+"%;}} @-webkit-keyframes swim_"+voter_id+"{from{left:-5%; top: "+getRand(5, 20)+"%;} "+top_poin_interval_1+"%{top:0%; transform: rotate(-25deg);} "+top_poin_interval_2+"%{top:-5%; transform: rotate(0deg);} to{left:100%; top: "+getRand(10, 40)+"%;}}",
            // правостороннее движение
            "@keyframes swim_"+voter_id+"{from{right:-5%; top: "+getRand(10, 82)+"%; transform:scaleX(-1);} to{right:100%; top: "+getRand(10, 82)+"%; transform:scaleX(-1);}} @-moz-keyframes swim_"+voter_id+"{from{right:-5%; top: "+getRand(10, 82)+"%; transform:scaleX(-1);} to{right:100%; top: "+getRand(10, 82)+"%; transform:scaleX(-1);}} @-webkit-keyframes swim_"+voter_id+"{from{right:-5%; top: "+getRand(10, 82)+"%; transform:scaleX(-1);} to{right:100%; top: "+getRand(10, 82)+"%; transform:scaleX(-1);}} #"+voter_id+" .is-right-side {transform:scaleX(-1);}",
            "@keyframes swim_"+voter_id+"{from{right:-5%; top: "+getRand(5, 82)+"%; transform:scaleX(-1);} "+top_poin_interval_1+"%{top:0%; transform: rotate(25deg) scaleX(-1);} "+top_poin_interval_2+"%{top:-6%; transform: rotate(0deg) scaleX(-1);} to{right:100%; top: "+getRand(10, 82)+"%; transform:scaleX(-1);}} @-moz-keyframes swim_"+voter_id+"{from{right:-6%; top: "+getRand(5, 82)+"%; transform:scaleX(-1);} "+top_poin_interval_1+"{top:0%; transform: rotate(25deg) scaleX(-1);} "+top_poin_interval_2+"%{top:-6%; transform: rotate(0deg) scaleX(-1);} to{right:100%; top: "+getRand(10, 82)+"%; transform:scaleX(-1);}} @-webkit-keyframes swim_"+voter_id+"{from{right:-5%; top: "+getRand(5, 82)+"%; transform:scaleX(-1);} "+top_poin_interval_1+"%{top:0%; transform: rotate(25deg) scaleX(-1);} "+top_poin_interval_2+"%{top:-5%; transform: rotate(0deg) scaleX(-1);} to{right:100%; top: "+getRand(10, 82)+"%; transform:scaleX(-1);}} #"+voter_id+" .is-right-side {transform:scaleX(-1);}",
        ];
        //_d(getRand(0, locus_set.length));
        return locus_set[getRand(0, locus_set.length-1)];
    }
    
    // случайное в диапазоне с равными вероятностями для пограничных значений
    function getRand(min, max) {
        var rand = min + Math.random() * (max + 1 - min);
        rand = Math.floor(rand);
        return rand*1;
    }
    
    // удалить все кроме чисел
    function validate(str){ 
        return str.replace(/[^\d]/g, ''); 
    }
    
    
    function _d(param){
        if(debug){
            console.log(param);
        }
    }
    
    
});