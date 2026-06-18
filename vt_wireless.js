'use strict';
'require view';
'require dom';
'require poll';
'require fs';
'require ui';
'require uci';
'require form';
'require network';
'require firewall';
'require tools.widgets as widgets';
'require tools.network as nettools';
'require rpc';

const device_2g = 'MT7993_1_1';
const device_5g = 'MT7993_1_2';
const apcli_regex = /apcli/;

const BAND_2G = '2.4G';
const BAND_5G = '5G';

var cur_inf;

var country_map_region_all = {
    '2.4G': {
        'JP': '1',
        'FR': '1',
        'IE': '1',
        'VN': '1',
        'US': '0',
        'HK': '1',
        'TW': '0',
        'NONE': '1'
    },
    '5G': {
        'JP': '1',
        'FR': '1',
        'IE': '1',
        'VN': '7',
        'US': '7',
        'HK': '7',
        'TW': '13',
        'NONE': '1'
    }
};

var cipher_opts = {'tkip': 'TKIP', 'aes': 'AES', 'tkip+aes': 'TKIP/AES'};
var country_opts = {'VN': 'VN (Vietnam)', 'US' : 'United States', 'JP' : 'Japan', 'FR' : 'France', 'TW' : 'Taiwan', 'IE' : 'Ireland', 'HK' : 'Hong Kong', 'NONE' : 'NONE'};
var auth_opts = {
    'open': 'OPEN',
    'psk': 'WPA-PSK',
    'psk2': 'WPA2-PSK',
    'psk-mixed': 'WPA-PSK/WPA2-PSK',
    'sae': 'WPA3-SAE',
    'sae-mixed' : 'WPA2-PSK/WPA3-SAE'
};

var auth_to_mapd = {
    'open': '0x0001',
    'psk' : '0x0002',
    'psk2' : '0x0020',
    'psk-mixed' : '0x0022',
    'sae' : '0x0040',
    'sae-mixed' : '0x0060' 
};

var cipher_to_mapd = {
    'none' : '0x0001',
    'tkip' : '0x0004',
    'aes' : '0x0008',
    'tkip+aes' : '0x000C'
};

var auth_to_cipher = {
    'open' : [
        'tkip', 'TKIP', false,
        'aes', 'AES', false,
        'tkip+aes', 'TKIP/AES', false
    ],
    'psk' : [
        'tkip', 'TKIP', true,
        'aes', 'AES', true,
        'tkip+aes', 'TKIP/AES', true
    ],
    'psk2' : [
        'tkip', 'TKIP', true,
        'aes', 'AES', true,
        'tkip+aes', 'TKIP/AES', true
    ],
    'psk-mixed' : [
        'tkip', 'TKIP', true,
        'aes', 'AES', true,
        'tkip+aes', 'TKIP/AES', true
    ],
    'sae' : [
        'tkip', 'TKIP', false,
        'aes', 'AES', true,
        'tkip+aes', 'TKIP/AES', false
    ],
    'sae-mixed' : [
        'tkip', 'TKIP', false,
        'aes', 'AES', true,
        'tkip+aes', 'TKIP/AES', false
    ]
}

var hidden_to_mapd = {
    '0' : 'N',
    '1' : 'Y'
};

function add_optlist(obj, opt_list){
    for (const [key, value] of Object.entries(opt_list)) {
        obj.value(key, _(value));
    }
}

var modes = {
    '2.4G': [
        '11b', '802.11b', true,
        '11g', '802.11g', true,
        '11b;11g', '802.11b/g', true,
        '11n', '802.11n', true,
        '11g;11n', '802.11g/n', true,
        '11b;11g;11n', '802.11b/g/n', true,
        '11b;11g;11n;11ax', '802.11/b/g/n/ax', true,
        '11b;11g;11n;11ax;11be', '802.11/b/g/n/ax/be', true
    ],

    '5G': [
        '11a', '802.11a', true,
        '11n', '802.11n', true,
        '11a;11n', '802.11a/n', true,
        '11n;11ac', '802.11n/ac', true,
        '11a;11n;11ac', '802.11a/n/ac', true,
        '11a;11n;11ac;11ax', '802.11a/n/ac/ax', true,
        '11a;11n;11ac;11ax;11be', '802.11a/n/ac/ax/be', true
    ]
};

var htmodes_2g = {
    '11b': [
        'NOHT', '20 MHz', true,
    ],
    '11g': [
        'NOHT', '20 MHz', true,
    ],
    '11b;11g': [
        'NOHT', '20 MHz', true,
    ],
    '11n': [
        '_HT20/40', _('Auto'), true,
        'HT20', '20 MHz', true,
        'HT40', '40 MHz', true
    ],
    '11g;11n': [
        '_HT20/40', _('Auto'), true,
        'HT20', '20 MHz', true,
        'HT40', '40 MHz', true
    ],
    '11b;11g;11n': [
        '_HT20/40', _('Auto'), true,
        'HT20', '20 MHz', true,
        'HT40', '40 MHz', true
    ],
    '11b;11g;11n;11ax': [
        '_HT20/40', _('Auto'), true,
        'HE20', '20 MHz', true,
        'HE40', '40 MHz', true
    ],
    '11b;11g;11n;11ax;11be': [
        '_HT20/40', _('Auto'), true,
        'EHT20', '20 MHz', true,
        'EHT40', '40 MHz', true
    ]
};


var htmodes_5g = {
    '11a': [
        'NOHT', '20 MHz', true,
    ],
    '11n': [
        '_HT40', _('Auto'), true,
        'HT20', '20 MHz', true,
        'HT40', '40 Mhz', true
    ],
    '11a;11n': [
        '_HT40', _('Auto'), true,
        'HT20', '20 MHz', true,
        'HT40', '40 Mhz', true
    ],
    '11n;11ac': [
        '_VHT160', _('Auto'), true,
        'VHT20', '20 MHz', true,
        'VHT40', '40 MHz', true,
        'VHT80', '80 Mhz', true,
        'VHT160', '160 Mhz', true
    ],
    '11a;11n;11ac': [
        '_VHT160', _('Auto'), true,
        'VHT20', '20 MHz', true,
        'VHT40', '40 MHz', true,
        'VHT80', '80 Mhz', true,
        'VHT160', '160 Mhz', true
    ],
    '11a;11n;11ac;11ax': [
        '_VHT160', _('Auto'), true,
        'HE20', '20 MHz', true,
        'HE40', '40 MHz', true,
        'HE80', '80 Mhz', true,
        'HE160', '160 Mhz', true
    ],
    '11a;11n;11ac;11ax;11be': [
        '_EHT160', _('Auto'), true,
        'EHT20', '20 MHz', true,
        'EHT40', '40 MHz', true,
        'EHT80', '80 Mhz', true,
        'EHT160', '160 Mhz', true
    ]
};

var CountryRegionList_All = {
    '2.4G': [
        '0', '0: Ch1~11', true,
        '1', '1: Ch1~13', true,
        '2', '2: Ch10~11', true,
        '3', '3: Ch10~13', true,
        '4', '4: Ch14', true,
        '5', '5: Ch1~14', true,
        '6', '6: Ch3~9', true,
        '7', '7: Ch5~13', true,
        '31', '31: Ch1~11, Ch12~14', true,
        '32', '32: Ch1~11, Ch12~13', true,
        '33', '33: Ch1~14', true,
    ],
    '5G': [
        '0', '0: Ch36~64, Ch149~165', true,
        '1', '1: Ch36~64, Ch100~140', true,
        '2', '2: Ch36~64', true,
        '3', '3: Ch52~64, Ch149~161', true,
        '4', '4: Ch149~165', true,
        '5', '5: Ch149~161', true,
        '6', '6: Ch36~48', true,
        '7', '7: Ch36~64, Ch100~140, Ch149~165', true,
        '8', '8: Ch52~64', true,
        '9', '9: Ch36~64, Ch100~116, Ch132~140, Ch149~165', true,
        '10', '10: Ch36~48, Ch149~165', true,
        '11', '11: Ch36~64, Ch100~120, Ch149~161', true,
        '12', '12: Ch36~64, Ch100~144', true,
        '13', '13: Ch36~64, Ch100~144, Ch149~165', true,
        '14', '14: Ch36~64, Ch100~116, Ch132~144, Ch149~165', true,
        '15', '15: Ch149~173', true,
        '16', '16: Ch52~64, Ch149~165', true,
        '17', '17: Ch36~48, Ch149~161', true,
        '18', '18: Ch36~64, Ch100~116, Ch132~140', true,
        '19', '19: Ch56~64, Ch100~140, Ch149~161', true,
        '20', '20: Ch36~64, Ch100~124, Ch149~161', true,
        '21', '21: Ch36~64, Ch100~140, Ch149~161', true,
        '22', '22: Ch100~140', true,
        '30', '30: Ch36~48, Ch52~64, Ch100~140, Ch149~165', true,
        '31', '31: Ch52~64, Ch100~140, Ch149~165', true,
        '32', '32: Ch36~48, Ch52~64, Ch100~140, Ch149~161', true,
        '33', '33: Ch36~48, Ch52~64, Ch100~140', true,
        '34', '34: Ch36~48, Ch52~64, Ch149~165', true,
        '35', '35: Ch36~48, Ch52~64', true,
        '36', '36: Ch36~48, Ch100~140, Ch149~165', true,
        '37', '37: Ch36~48, Ch52~64, Ch149~165, Ch173', true,
    ]
};

var ChannelList_2G_All_Region = {
    "channel 0": {},
    "channel 1": {"region 0" : 1, "region 1" : 1, "region 5" : 1, "region 31" : 1, "region 32": 1, "region 33" : 1},
    "channel 2": {"region 0" : 1, "region 1" : 1, "region 5" : 1, "region 31" : 1, "region 32": 1, "region 33" : 1},
    "channel 3":  {"region 0" : 1, "region 1" : 1, "region 5" : 1, "region 6": 1, "region 31" : 1, "region 32": 1, "region 33" : 1},
    "channel 4":  {"region 0" : 1, "region 1" : 1, "region 5" : 1, "region 6": 1, "region 31" : 1, "region 32": 1, "region 33" : 1},
    "channel 5":  {"region 0" : 1, "region 1" : 1, "region 5" : 1, "region 6": 1, "region 7": 1,  "region 31" : 1, "region 32": 1, "region 33" : 1},
    "channel 6":  {"region 0" : 1, "region 1" : 1, "region 5" : 1, "region 6": 1, "region 7": 1,  "region 31" : 1, "region 32": 1, "region 33" : 1},
    "channel 7":  {"region 0" : 1, "region 1" : 1, "region 5" : 1, "region 6": 1, "region 7": 1,  "region 31" : 1, "region 32": 1, "region 33" : 1},
    "channel 8":  {"region 0" : 1, "region 1" : 1, "region 5" : 1, "region 6": 1, "region 7": 1,  "region 31" : 1, "region 32": 1, "region 33" : 1},
    "channel 9":  {"region 0" : 1, "region 1" : 1, "region 5" : 1, "region 6": 1, "region 7": 1, "region 31" : 1, "region 32": 1, "region 33" : 1},
    "channel 10":  {"region 0" : 1, "region 1" : 1, "region 2" : 2, "region 3" : 3, "region 5" : 1, "region 7": 1, "region 31" : 1, "region 32": 1, "region 33" : 1},
    "channel 11":  {"region 0" : 1, "region 1" : 1, "region 2" : 2, "region 3" : 3, "region 5" : 1, "region 7": 1, "region 31" : 1, "region 32": 1, "region 33" : 1},
    "channel 12":  {"region 1" : 1, "region 3" : 1, "region 5" : 1, "region 7": 1, "region 31" : 1, "region 32": 1, "region 33" : 1},
    "channel 13":  {"region 1" : 1, "region 3" : 1, "region 5" : 1, "region 7": 1, "region 31" : 1, "region 32": 1, "region 33" : 1},
    "channel 14":  {"region 4" : 1, "region 5" : 1, "region 31" : 1, "region 33" : 1},
};

var ChannelList_5G_All_Region = {
    "channel 0": {}, 
    "channel 36": {"region 0" : 1, "region 1" : 1, "region 2" : 1, "region 6" : 1, "region 7" : 1, "region 9" : 1, "region 10" : 1, "region 11" : 1, "region 12" : 1, "region 13" : 1, "region 14" : 1, "region 17" : 1, "region 18" : 1, "region 20" : 1, "region 21" : 1, "region 30" : 1, "region 32" : 1, "region 33": 1, "region 34" : 1, "region 35" : 1, "region 36" : 1, "region 37" : 1},
    "channel 40": {"region 0" : 1, "region 1" : 1, "region 2" : 1, "region 6" : 1, "region 7" : 1, "region 9" : 1, "region 10" : 1, "region 11" : 1, "region 12" : 1, "region 13" : 1, "region 14" : 1, "region 17" : 1, "region 18" : 1, "region 20" : 1, "region 21" : 1, "region 30" : 1, "region 32" : 1, "region 33": 1, "region 34" : 1, "region 35" : 1, "region 36" : 1, "region 37" : 1},
    "channel 44": {"region 0" : 1, "region 1" : 1, "region 2" : 1, "region 6" : 1, "region 7" : 1, "region 9" : 1, "region 10" : 1, "region 11" : 1, "region 12" : 1, "region 13" : 1, "region 14" : 1, "region 17" : 1, "region 18" : 1, "region 20" : 1, "region 21" : 1, "region 30" : 1, "region 32" : 1, "region 33": 1, "region 34" : 1, "region 35" : 1, "region 36" : 1, "region 37" : 1},
    "channel 48": {"region 0" : 1, "region 1" : 1, "region 2" : 1, "region 6" : 1, "region 7" : 1, "region 9" : 1, "region 10" : 1, "region 11" : 1, "region 12" : 1, "region 13" : 1, "region 14" : 1, "region 17" : 1, "region 18" : 1, "region 20" : 1, "region 21" : 1, "region 30" : 1, "region 32" : 1, "region 33": 1, "region 34" : 1, "region 35" : 1, "region 36" : 1, "region 37" : 1},
    "channel 52": {"region 0" : 1, "region 1" : 1, "region 2" : 1, "region 3" : 1, "region 7" : 1, "region 8" : 1, "region 9" : 1, "region 11" : 1, "region 12" : 1, "region 13" : 1, "region 14" : 1, "region 16" : 1, "region 18" : 1, "region 20" : 1, "region 21" : 1, "region 30" : 1, "region 31" : 1, "region 32" : 1, "region 33": 1, "region 34" : 1, "region 35" : 1, "region 37" : 1},
    "channel 56": {"region 0" : 1, "region 1" : 1, "region 2" : 1, "region 3" : 1, "region 7" : 1, "region 8" : 1, "region 9" : 1, "region 11" : 1, "region 12" : 1, "region 13" : 1, "region 14" : 1, "region 16" : 1, "region 18" : 1, "region 19" : 1, "region 20" : 1, "region 21" : 1, "region 30" : 1, "region 31" : 1, "region 32" : 1, "region 33": 1, "region 34" : 1, "region 35" : 1, "region 37" : 1},
    "channel 60": {"region 0" : 1, "region 1" : 1, "region 2" : 1, "region 3" : 1, "region 7" : 1, "region 8" : 1, "region 9" : 1, "region 11" : 1, "region 12" : 1, "region 13" : 1, "region 14" : 1, "region 16" : 1, "region 18" : 1, "region 19" : 1, "region 20" : 1, "region 21" : 1, "region 30" : 1, "region 31" : 1, "region 32" : 1, "region 33": 1, "region 34" : 1, "region 35" : 1, "region 37" : 1},
    "channel 64": {"region 0" : 1, "region 1" : 1, "region 2" : 1, "region 3" : 1, "region 7" : 1, "region 8" : 1, "region 9" : 1, "region 11" : 1, "region 12" : 1, "region 13" : 1, "region 14" : 1, "region 16" : 1, "region 18" : 1, "region 19" : 1, "region 20" : 1, "region 21" : 1, "region 30" : 1, "region 31" : 1, "region 32" : 1, "region 33": 1, "region 34" : 1, "region 35" : 1, "region 37" : 1},
    "channel 100": {"region 1" : 1, "region 7" : 1, "region 9" : 1, "region 11" : 1, "region 12" : 1, "region 13" : 1, "region 14" : 1, "region 18" : 1, "region 19" : 1, "region 20" : 1, "region 21" : 1, "region 22" : 1, "region 30" : 1, "region 31" : 1, "region 32" : 1, "region 33": 1, "region 36" : 1},
    "channel 104": {"region 1" : 1, "region 7" : 1, "region 9" : 1, "region 11" : 1, "region 12" : 1, "region 13" : 1, "region 14" : 1, "region 18" : 1, "region 19" : 1, "region 20" : 1, "region 21" : 1, "region 22" : 1, "region 30" : 1, "region 31" : 1, "region 32" : 1, "region 33": 1, "region 36" : 1},
    "channel 108": {"region 1" : 1, "region 7" : 1, "region 9" : 1, "region 11" : 1, "region 12" : 1, "region 13" : 1, "region 14" : 1, "region 18" : 1, "region 19" : 1, "region 20" : 1, "region 21" : 1, "region 22" : 1, "region 30" : 1, "region 31" : 1, "region 32" : 1, "region 33": 1, "region 36" : 1},
    "channel 112": {"region 1" : 1, "region 7" : 1, "region 9" : 1, "region 11" : 1, "region 12" : 1, "region 13" : 1, "region 14" : 1, "region 18" : 1, "region 19" : 1, "region 20" : 1, "region 21" : 1, "region 22" : 1, "region 30" : 1, "region 31" : 1, "region 32" : 1, "region 33": 1, "region 36" : 1},
    "channel 116": {"region 1" : 1, "region 7" : 1, "region 9" : 1, "region 11" : 1, "region 12" : 1, "region 13" : 1, "region 14" : 1, "region 18" : 1, "region 19" : 1, "region 20" : 1, "region 21" : 1, "region 22" : 1, "region 30" : 1, "region 31" : 1, "region 32" : 1, "region 33": 1, "region 36" : 1},
    "channel 120": {"region 1" : 1, "region 7" : 1, "region 11" : 1, "region 12" : 1, "region 13" : 1, "region 19" : 1, "region 20" : 1, "region 21" : 1, "region 22" : 1, "region 30" : 1, "region 31" : 1, "region 32" : 1, "region 33": 1, "region 36" : 1},
    "channel 144": {"region 12" : 1, "region 13" : 1, "region 14" : 1},
    "channel 149": {"region 0" : 1, "region 3" : 1, "region 4" : 1, "region 5" : 1, "region 7" : 1, "region 9" : 1, "region 10" : 1, "region 11" : 1, "region 13" : 1, "region 14" : 1, "region 15" : 1, "region 16" : 1, "region 17" : 1, "region 19" : 1, "region 20" : 1, "region 21" : 1, "region 30" : 1, "region 31" : 1, "region 32" : 1, "region 34" : 1, "region 36" : 1, "region 37" : 1},
    "channel 153": {"region 0" : 1, "region 3" : 1, "region 4" : 1, "region 5" : 1, "region 7" : 1, "region 9" : 1, "region 10" : 1, "region 11" : 1, "region 13" : 1, "region 14" : 1, "region 15" : 1, "region 16" : 1, "region 17" : 1, "region 19" : 1, "region 20" : 1, "region 21" : 1, "region 30" : 1, "region 31" : 1, "region 32" : 1, "region 34" : 1, "region 36" : 1, "region 37" : 1},
    "channel 157": {"region 0" : 1, "region 3" : 1, "region 4" : 1, "region 5" : 1, "region 7" : 1, "region 9" : 1, "region 10" : 1, "region 11" : 1, "region 13" : 1, "region 14" : 1, "region 15" : 1, "region 16" : 1, "region 17" : 1, "region 19" : 1, "region 20" : 1, "region 21" : 1, "region 30" : 1, "region 31" : 1, "region 32" : 1, "region 34" : 1, "region 36" : 1, "region 37" : 1},
    "channel 161": {"region 0" : 1, "region 3" : 1, "region 4" : 1, "region 5" : 1, "region 7" : 1, "region 9" : 1, "region 10" : 1, "region 11" : 1, "region 13" : 1, "region 14" : 1, "region 15" : 1, "region 16" : 1, "region 17" : 1, "region 19" : 1, "region 20" : 1, "region 21" : 1, "region 30" : 1, "region 31" : 1, "region 32" : 1, "region 34" : 1, "region 36" : 1, "region 37" : 1},
    "channel 169": {"region 15" : 1},
    "channel 173": {"region 15" : 1, "region 37" : 1}
};

var ChannelList = {
    '2.4G': [
        'auto', _('Auto'), true,
        '1', '1', true,
        '2', '2', true,
        '3', '3', true,
        '4', '4', true,
        '5', '5', true,
        '6', '6', true,
        '7', '7', true,
        '8', '8', true,
        '9', '9', true,
        '10', '10', true,
        '11', '11', true,
        '12', '12', true,
        '13', '13', true,
        '14', '14', true
    ],
    '5G': [
        'auto', _('Auto'), true,
        '36', '36', true,
        '40', '40', true,
        '44', '44', true,
        '48', '48', true,
        '52', '52', true,
        '56', '56', true,
        '60', '60', true,
        '64', '64', true,
        '100', '100', true,
        '104', '104', true,
        '108', '108', true,
        '112', '112', true,
        '116', '116', true,
        '120', '120', true,
        '144', '144', true,
        '149', '149', true,
        '153', '153', true,
        '157', '157', true,
        '161', '161', true,
        '169', '169', true,
        '173', '173', true
    ]
};

function count_changes(section_id) {
    var changes = ui.changes.changes, n = 0;

    if (!L.isObject(changes))
        return n;

    if (Array.isArray(changes.wireless))
        for (var i = 0; i < changes.wireless.length; i++)
            n += (changes.wireless[i][1] == section_id);

    return n;
}

function numProps(obj) {
    var c = 0;
    for (var key in obj) {
    if (obj.hasOwnProperty(key)) ++c;
    }
    return c;
}

function set_depends(abstractValues, cur_inf)
{
    switch (abstractValues.option) {
        case '_cipher':
            abstractValues.depends({'_auth': 'open', '!reverse': true});
            break;
        case 'ssid':
            break;
        case 'key':
            abstractValues.depends({'_auth': 'open', '!reverse': true});
            break;
        case '_pmf_capable':
            abstractValues.depends({'_auth': 'psk'});
            abstractValues.depends({'_auth': 'psk2'});
            abstractValues.depends({'_auth': 'psk-mixed'});
            break;
        case '_group_rekey_int':
            abstractValues.depends({'_auth': 'open', '!reverse': true});
            break;
        case 'wps_pushbutton':
            var mapEnable = uci.get('mapd', 'mapd_cfg', 'MapEnable');
            if (mapEnable == '1' && cur_inf == 'rai0') {
                abstractValues.display = false; 
            }
            abstractValues.depends({'_auth': 'psk'});
            abstractValues.depends({'_auth': 'psk2'});
            abstractValues.depends({'_auth': 'psk-mixed'});
            abstractValues.depends({'_auth': 'sae-mixed'});
            break;
            
        default:
            break;
    }
    return true;
}

function render_status(node, section_id, is_wifiiface, channel_2g, channel_5g) {
    var if_channel, if_mode, if_bssid, if_disabled, band, mld_disabled, mld_warning;
    if (is_wifiiface){
        var wifi_device = uci.get('wireless', section_id, 'device'),
        if_channel = uci.get('wireless', wifi_device, 'channel'),
        if_mode = uci.get('wireless', wifi_device, 'hwmode'),
        band = uci.get('wireless', wifi_device, 'band'),
        if_disabled = uci.get('wireless', section_id, 'disabled');
        network.getWifiNetwork(section_id).then(function(radioNet){
            if_bssid = radioNet.getName();
        });
        
        for (var i = 0; modes[band] && i < modes[band].length; i += 3){
            if (modes[band][i] == if_mode){
                if_mode = modes[band][i+1];
                break;
            }
        }

        if (band == BAND_2G && if_channel == 'auto'){
            if_channel = String(channel_2g).match(/channel\s+(\d+)/);
            if (!if_channel) if_channel = _('Getting channel of band 2.4GHz...');
            else {
                if_channel = if_channel ? if_channel[1] : null;
            }
        }
        else if (band == BAND_5G && if_channel == 'auto'){
            if_channel = String(channel_5g).match(/channel\s+(\d+)/);
            if (!if_channel) if_channel = _('Getting channel of band 5GHz...');
            else {
                if_channel = if_channel ? if_channel[1] : null;
            }
        }

        mld_disabled = uci.get('wireless', 'apmld2', 'disabled');
        mld_warning = (mld_disabled == '0' && (section_id == 'ra1' || section_id == 'rai1')) ? _('Cannot configure this SSID while MLO is enabled') : null;
    }

    return L.itemlist(node, [
        _('SSID'), is_wifiiface ? uci.get('wireless', section_id, 'ssid') : null,
        _('Channel'), is_wifiiface ? if_channel : null,
        _(''), (is_wifiiface && (if_disabled == '1') ) ? _('Wireless is disabled or not associated') : null ,
        _('Mode'), (is_wifiiface && (if_disabled == '0')) ? if_mode : null,
        _('BSSID'), (is_wifiiface && (if_disabled == '0')) ? if_bssid : null,
        _(''), mld_warning,
    ]);
}

function render_iface_badge(section_id) {
    var if_enabled = uci.get('wireless', section_id, 'disabled') == '0',
        if_idx = 'SSID ' + (Number(section_id.substr(-1)) + 1).toString();
    return E('span', { 'class': 'ifacebadge' }, [
        E('img', { 'src': L.resource('icons/wifi%s.png').format(if_enabled ? '' : '_disabled'), "style" : if_enabled ? "filter: invert(31%) sepia(78%) saturate(1211%) hue-rotate(190deg) brightness(107%);" : ""  }),
        ' ',
        if_idx
    ]);
}

function render_network_badge(section_id) {
    var band = uci.get('wireless', section_id, 'band'),
        network_name;
    if (band == BAND_2G) network_name = _('Wireless 2.4GHz');
    else if (band == BAND_5G) network_name = _('Wireless 5GHz');
    return E('span', { 'class': 'ifacebadge' , 'style': 'font-weight: bold; font-size: 20px' }, [
        E('img', { 'src': L.resource('icons/signal-75-100.png').format(uci.get('wireless', section_id, 'state') == '1' ? '' : '_disabled') }),
        ' ',
        network_name
    ]);
}


function setValues(sel, vals) {
    if (sel.vals)
        sel.vals.selected = sel.selectedIndex;

    while (sel.options[0]){
        sel.remove(0);
    }

    for (var i = 0; vals && i < vals.length; i += 3)
        if (vals[i+2]) 
            sel.add(E('option', { value: vals[i+0] }, [ vals[i+1] ]));

    if (vals && !isNaN(vals.selected))
        sel.selectedIndex = vals.selected;

    sel.parentNode.style.display = (sel.options.length <= 0) ? 'none' : '';
    sel.vals = vals;
}

function setSelect(item, sValue) {
    for (var i = 0; i < item.options.length; i++) {
        if (item.options[i].value == sValue) {
            item.selectedIndex = i;
            return true;
        }
    }

    return false;
}

function WifiHTMode_onchange(elem, section_id){
    var cur_mode = elem.querySelector('#mode'),
        band = uci.get("wireless", section_id, "band"),
        bwdt = document.querySelector('#bandwidth'),
        htmodes;
    if (band == BAND_2G){
        htmodes = htmodes_2g;
    }
    else if (band == BAND_5G){
        htmodes = htmodes_5g;
    }
    setValues(bwdt, htmodes[cur_mode.value]);

    if (band == BAND_2G) {
        setSelect(bwdt, 'HT20');
    }
    else {
        switch (cur_mode.value) {
            case '11a':
            case '11n':
                setSelect(bwdt, 'HT20');
                break;
            case '11a;11n':
                setSelect(bwdt, 'VHT20');
                break;
            case '11n;11ac':
            case '11a;11n;11ac':
            case '11a;11n;11ac;11ax':
                setSelect(bwdt, 'VHT80');
                break;
            default:
                break;
        }
    }
}

function WifiMode_onchange(elem, section_id) {
    var mode = elem.querySelector('#mode');
    var country_section_id = 'widget.cbid.wireless.' + section_id + '.country';
    var country = document.getElementById(country_section_id);
    WifiHTMode_onchange(elem, section_id);
    countrycode_onchange(section_id, country.value);
}

function countrycode_onchange(section_id, value, elem){
    var band = uci.get("wireless", section_id, "band");
    var ChannelList_All_Region;
    var region_opt;
    if (band == BAND_2G){
        ChannelList_All_Region = ChannelList_2G_All_Region;
        region_opt = 'region';
    }
    else if (band == BAND_5G){
        ChannelList_All_Region = ChannelList_5G_All_Region;
        region_opt = 'aregion';
    }
    var region_num, country_region, i;
    var	channel;
    if(value != null){
        channel = document.querySelector('#channel');
        region_num = country_map_region_all[band][value];
    }
    else {
        channel = elem.querySelector('#channel');
        region_num = uci.get('wireless', section_id, region_opt);
    }
    // country_region = "region " + region_num.toString();
    country_region = "region " + region_num;
    
    for (i = 0; i < numProps(ChannelList_All_Region); i++) {
        var ref_channel = 'channel ' + ChannelList[band][i*3];
        var channel_enabled;
        if (ChannelList[band][i*3] == 'auto') {
            channel_enabled = true;
        }
        else{
            channel_enabled = ChannelList_All_Region[ref_channel][country_region];
        }
        if (channel_enabled){
            ChannelList[band][i*3 + 2] = true;
        }
        else {
            ChannelList[band][i*3 + 2] = false;
        }
    }
    setValues(channel, ChannelList[band]);
}



var CBIWifiModeValue = form.ListValue.extend({
    renderWidget: function(section_id, option_index, cfgvalue) {
        var elem = E('div');
        dom.content(elem, [
                E('select', {
                    'class': 'mode cbi-input-select',
                    'id': 'mode',
                    'change': L.bind(WifiMode_onchange, this, elem, section_id),
                    'disabled': (this.disabled != null) ? this.disabled : this.map.readonly
                })
            ]);
        var band = uci.get('wireless', section_id, 'band');
        var mode = elem.querySelector('#mode');
        var hwmode_val = uci.get('wireless', section_id, 'hwmode');
        setValues(mode, modes[band]);
        mode.value = hwmode_val;
        return elem;
    },

    formvalue: function(section_id) {
        var node = this.map.findElement('data-field', this.cbid(section_id));
        return node.querySelector('#mode').value;
    },

    cfgvalue: function(section_id) {
        return uci.get('wireless', section_id, 'hwmode');
        
    },
    write: function(section_id, value) {
        uci.set('wireless', section_id, 'hwmode', value);
    }
});



var CBIWifiBWValue = form.ListValue.extend({
    renderWidget: function(section_id, option_index, cfgvalue) {
        var elem = E('div');
        dom.content(elem, [
                E('select', {
                    'class': 'bandwidth cbi-input-select',
                    'id': 'bandwidth',
                    'disabled': (this.disabled != null) ? this.disabled : this.map.readonly
                })	
            ]);
        var bw = elem.querySelector('#bandwidth');
        var cur_mode = uci.get('wireless', section_id, 'hwmode');
        var band = uci.get('wireless', section_id, 'band');
        var htmodes;

        if (band == BAND_2G){
            htmodes = htmodes_2g;
        }
        else if (band == BAND_5G){
            htmodes = htmodes_5g;
        }
        setValues(bw, htmodes[cur_mode]);
        
        var htmode = uci.get('wireless', section_id, '_htmode');
        var ht_coex = uci.get('wireless', section_id, 'ht_coex');
        if ((htmode == 'HT40' || htmode == 'HE40' || htmode == 'EHT40') && ht_coex == '1'){
            htmode = '_HT20/40';
        }
        bw.value = htmode;
        return elem;
    },

    formvalue: function(section_id) {
        var node = this.map.findElement('data-field', this.cbid(section_id));
        return node.querySelector('#bandwidth').value;	
    },

    cfgvalue: function(section_id) {
        return [
            uci.get('wireless', section_id, '_htmode'),
            uci.get('wireless', section_id, 'ht_coex')
        ];
    },
    write: function(section_id, value) {
        if (value == '_HT20/40') {
            uci.unset('wireless', section_id, 'ht_coex');
            uci.set('wireless', section_id, 'ht_coex', '1');
            uci.set('wireless', section_id, '_htmode', 'HT40');
        }
        else {
            uci.unset('wireless', section_id, 'ht_coex');
            uci.set('wireless', section_id, 'ht_coex', '0');
            uci.set('wireless', section_id, '_htmode', value);
        }
    }
});


var CBIWifiChannelValue = form.ListValue.extend({
    renderWidget: function(section_id, option_index, cfgvalue) {
        var elem = E('div');
        dom.content(elem, [
                E('select', {
                    'class': 'channel cbi-input-select',
                    'id': 'channel',
                    'disabled': (this.disabled != null) ? this.disabled : this.map.readonly
                })
            ]);
        
        var cr = elem.querySelector('#channel'),
            band = uci.get('wireless', section_id, 'band');
        setValues(cr, ChannelList[band]);
        countrycode_onchange(section_id, null, elem);
        cr.value = uci.get('wireless', section_id, 'channel');
        return elem;
    },

    formvalue: function(section_id) {
        var node = this.map.findElement('data-field', this.cbid(section_id));
        return node.querySelector('#channel').value;
    },

    cfgvalue: function(section_id) {
        return uci.get('wireless', section_id, 'channel');
    },

    write: function(section_id, value) {
        uci.set('wireless', section_id, 'channel', value);
    }
});


return view.extend({
    
    load: function() {
        return Promise.all([
            // uci.changes(),
            // network.getDevices(),
            // uci.load('wifi_schedule')
            uci.load('wireless')
        ]);
    },



    render: function(data) {
        var m, s, o;
        var bndstr_enable;
        m = new form.Map('wireless', _('Wireless Configuration'), _(''));
        m.view = this;
        m.chain('mapd');
        m.tabbed = false;

        s = m.section(form.GridSection, 'wifi-device', _('Wireless Overview'));
        s.addApply = true;
        s.anonymous = true;
        s.addremove = false;
        s.editable = true;
        s.nosection_text = _('Agent cannot config wifi');

        s.load = function() {
            return network.getWifiDevices().then(L.bind(function(radios) {
                this.radios = radios.sort(function(a, b) {
                    return a.getName() > b.getName();
                });

                var tasks = [];

                for (var i = 0; i < radios.length; i++)
                    tasks.push(radios[i].getWifiNetworks());

                return Promise.all(tasks);
            }, this)).then(L.bind(function(data) {
                this.wifis = [];

                for (var i = 0; i < data.length; i++)
                    this.wifis.push.apply(this.wifis, data[i]);
            }, this));
        };

        s.cfgsections = function() {
            var rv = [], wifi_if;
            var backhaul_if = [];
            var dev_role = uci.get('mapd', 'mapd_cfg', 'DeviceRole');
            var is_mesh_enable = uci.get('mapd', 'mapd_cfg', 'MapEnable');
            bndstr_enable = uci.get('mapd', 'mapd_cfg', 'BandSteeringEnable');
            var radio_2g_enable = uci.get('wireless', 'MT7993_1_1', 'disabled') == '0';
            var radio_5g_enable = uci.get('wireless', 'MT7993_1_2', 'disabled') == '0';
            if (dev_role == '2' && is_mesh_enable == '1'){
                rv = [];
            }
            else{
                if (is_mesh_enable == '1'){
                    var wbh0_disabled = uci.get('wireless', 'wbh0', 'disabled');
                    var wbh1_disabled = uci.get('wireless', 'wbh1', 'disabled');

                    if (wbh0_disabled == '0') {
                        backhaul_if.push(uci.get('wireless', 'wbh0', 'iface'));
                    }
                    if (wbh1_disabled == '0') {
                        backhaul_if.push(uci.get('wireless', 'wbh1', 'iface'));
                    }
                }
                else {
                    backhaul_if = [];
                }
                for (var i = 0; i < this.radios.length; i++) {
                    rv.push(this.radios[i].getName());
                    for (var j = 0; j < this.wifis.length; j++){
                        wifi_if = this.wifis[j].getName();
                        // if (wifi_if != backhaul_if){
                        if (!backhaul_if.includes(wifi_if)) {
                            if (this.wifis[j].getWifiDeviceName() == this.radios[i].getName() && !apcli_regex.test(wifi_if) )
                            {
                                if ( this.radios[i].getName() == device_2g){
                                    if (radio_2g_enable) rv.push(wifi_if);
                                }

                                if ( this.radios[i].getName() == device_5g){
                                    if (radio_5g_enable) rv.push(wifi_if);
                                }			
                            }
                        }
                    }
                }
        }
            return rv;
        };

        s.modaltitle = function(section_id) {
            var radioNet = this.wifis.filter(function(w) {return w.getName() == section_id})[0];
            var is_wifiiface;
            var wireless_text;
            if (section_id == device_2g || section_id == device_5g) {
                is_wifiiface = 0;
                if (section_id == device_2g) wireless_text = _('Wireless 2.4GHz');
                else wireless_text = _('Wireless 5GHz');
            }
            else {
                var if_device = uci.get('wireless', section_id, 'device');
                if (if_device == device_2g) wireless_text = _('Wireless 2.4GHz');
                else wireless_text = _('Wireless 5GHz');
                is_wifiiface = 1;
            }
            return is_wifiiface ? (('Interface configuration') + ' - ' + wireless_text + '@' + 'SSID' + (parseInt(section_id.match(/\d+$/)[0], 10) + 1)) : (('Device configuration') + ' - ' + wireless_text);
        };


        s.lookupRadioOrNetwork = function(section_id) {
            var radioDev = this.radios.filter(function(r) { return r.getName() == section_id })[0];
            if (radioDev)
                return radioDev;

            var radioNet = this.wifis.filter(function(w) { return w.getName() == section_id })[0];
            if (radioNet)
                return radioNet;

            return null;
        };

        s.renderRowActions = function(section_id) {	
            var inst = this.lookupRadioOrNetwork(section_id),
                btns;
            var mldDisabled = uci.get('wireless', 'apmld2', 'disabled');
            var disableBtn = mldDisabled == '0' && (section_id == 'ra1' || section_id == 'rai1') ? true : false;

            var attrs = {
                'id': 'btn_config_' + section_id,
                'class': 'cbi-button cbi-button-action important',
                'title': _('Configure this network'),
                'click': ui.createHandlerFn(this, 'renderMoreOptionsModal', section_id)
            }

            if (disableBtn) {
                attrs.disabled = 'disabled';
            }

            btns = [E('button', attrs, _('Config')), ];
            return E('td', { 'class': 'td middle cbi-section-actions' }, E('div', btns));
        };

        s.addModalOptions = function(s) {
            var inst = this.lookupRadioOrNetwork(s.section);
            var o, ss, enable_ssid;
            if(!inst.getWifiNetworks){
                cur_inf = s.section;
                if (bndstr_enable == "1" && s.section == "rai0") {
                    s.section = "ra0";
                }
                return network.getWifiNetwork(s.section).then(function(radioNet) {
                    var cur_wifiiface = radioNet.getName();
                    var if_idx = uci.get('wireless', cur_wifiiface, '_vifidx');
                    var device =  uci.get('wireless', cur_wifiiface, 'device');
                    if (device == device_5g){
                        if_idx = (Number(if_idx) + 4).toString();
                    }

                    var o, ss, encrypt_type, ssid;
                    o = s.option(form.SectionValue, '_iface', form.NamedSection, radioNet.getName(), 'wifi-iface');
                    o.modalonly = true;
                    ss = o.subsection;

                    enable_ssid = ss.option(form.Flag, 'disabled', _('Enable SSID'));
                    enable_ssid.keepcfg = true;
                    enable_ssid.enabled = '0';
                    enable_ssid.disabled = '1';
                    enable_ssid.rmempty = false;
    
                    o = ss.option(form.Value, 'ssid', _('<abbr title="Extended Service Set Identifier">ESSID</abbr>'));
                    o.datatype = 'and(rangelength(1, 32), ssid)';
                    o.rmempty = false;
                    
                    o.write = function(section_id, value){
                        uci.set('wireless', section_id, 'ssid', value);
                        // uci.set('mapd', if_idx, 'ssid', value);
                    }
            
                    o = ss.option(form.ListValue, '_auth', _('Authentication'));
                    var cur_auth = uci.get('wireless', cur_wifiiface, '_auth');
                    add_optlist(o, auth_opts);
                    o.default = cur_auth;
                    o.onchange = function(ev, section_id, value) {
                        var cipher_id = 'widget.cbid.wireless.' + section_id + '._cipher';
                        var cipher = document.getElementById(cipher_id);
                        setValues(cipher, auth_to_cipher[value]);
                        cipher.value = 'aes';
                    }
                    

                    o.write = function(section_id, value){
                        if( value == 'open'){
                            uci.set('wireless', section_id, '_cipher', 'none');
                            uci.set('wireless', section_id, '_pmf_capable', '0');
                            // uci.set('mapd', if_idx, 'EncryptType', cipher_to_mapd['none']);
                        }
                        uci.set('wireless', section_id, '_auth', value);
                        // uci.set('mapd', if_idx, 'authmode', auth_to_mapd[value]);

                        if (value == 'sae' || value == 'sae-mixed'){
                            uci.set('wireless', section_id, '_pmf_capable', '0');
                        }

                    }
                    
                    o = ss.option(form.ListValue, '_cipher', _('Cipher'));
                    if (cur_auth == 'sae-mixed' || cur_auth == 'sae')
                    {
                        cipher_opts = {'aes': 'AES'};
                    }

                    add_optlist(o, cipher_opts);
                    o.default = uci.get('wireless', cur_wifiiface, '_cipher');
                    o.keepcfg = true;
                    o.write = function(section_id, value){
                        uci.set('wireless', section_id, '_cipher', value);
                        // uci.set('mapd', if_idx, 'EncryptType', cipher_to_mapd[value]);
                    }

                    o = ss.option(form.Value, 'key', _('Password'));
                    o.keepcfg = true;
                    o.datatype = 'and(rangelength(8, 63), passwordWifi)';
                    o.rmempty = false;

                    o.write = function(section_id, value){
                        uci.set('wireless', section_id, 'key', value);
                        // uci.set('mapd', if_idx, 'PSK', value);
                    }

                    o = ss.option(form.Value, "maxassoc", _('Max Connected Client'));
                    o.datatype = 'range(1, 45)';
                    o.rmempty = false;

                    o = ss.option(form.Value, "_group_rekey_int", _('Key Renewal Interval'));
                    o.datatype = 'range(1800, 60000000)';
                    o.rmempty = false;
                    o.default = '10800';

                    o = ss.option(form.Flag, '_pmf_capable', _('PMF Capable'));
                    o.editable = true;
                    o.rmempty = false;
                    o.keepcfg = true;
                    o.enabled = '1';
                    o.disabled = '0'
                    o.default = o.disabled;

                    o = ss.option(form.Flag, "wps_pushbutton", _('WPS Enable'));
                    o.editable = true;
                    o.rmempty = false;
                    o.keepcfg = true;
                    o.enabled = '1';
                    o.disabled = '0'

                    o = ss.option(form.Flag, 'hidden', _('Hidden SSID'));
                    o.rmempty = false;
                    o.keepcfg = true;
                    o.enabled = '1';
                    o.disabled = '0';
                    o.write = function(section_id, value){
                        uci.set('wireless', section_id, 'hidden', value);
                        // uci.set('mapd', if_idx, 'hidden', hidden_to_mapd[value]);
                    }

                    for (var i = 0; i < ss.children.length; i++) {
                        set_depends(ss.children[i], cur_inf);
                    }
                });
            }
            else {
                return network.getWifiDevice(s.section).then(function(radioNet) {
                    o = s.option(form.SectionValue, '_device', form.NamedSection, radioNet.getName(), 'wifi-device');
                    o.modalonly = true;
                    ss = o.subsection;
                    ss.tab('general', _('General Setup'));
                    ss.tab('advanced', _('Advanced Settings'));

                    o = ss.taboption('general', form.Flag, 'disabled', _('Enable Wi-Fi'));
                    o.keepcfg = true;
                    o.enabled = '0';
                    o.disabled = '1';
                    o.default = o.disabled;	
                    o.rmempty = false;

                    o = ss.taboption('general', CBIWifiModeValue, 'hwmode', _('Physical Mode'));
                    o.ucisection = s.section;

                    o = ss.taboption('general', CBIWifiChannelValue, 'channel', _('Channel'));
                    o.ucisection = s.section;

                    o = ss.taboption('general', CBIWifiBWValue , '_htmode', _('Bandwidth'));

                    o = ss.taboption('general', form.ListValue, 'txpower', _('Transmitting Power'));
                    o.value('25', _('25%'));
                    o.value('50', _('50%'));
                    o.value('75', _('75%'));
                    o.value('100', _('100%'));
                    o.default = '100';

                    o = ss.taboption('advanced', form.ListValue, 'country', _('Country Code'));
                    add_optlist(o, country_opts);
                    o.id = 'countrycode';
                    o.onchange = function(ev, section_id, value) {
                        countrycode_onchange(section_id, value);
                    }

                    o = ss.taboption('advanced', form.Value, 'beacon_int', _('Beacon Interval'));
                    o.datatype = 'range(100, 1000)';
                    o.default = '100';
                    o.rmempty = false;

                    o = ss.taboption('advanced', form.Value, 'rts', _('RTS/CTS Threshold'));
                    o.datatype = 'range(1500, 2347)';
                    o.default = '2347';
                    o.rmempty = false;

                    o = ss.taboption('advanced', form.Value, 'frag', _('Fragment Threshold'));
                    o.datatype = 'range(256, 2346)';
                    o.default = '2346';
                    o.rmempty = false;

                    o = ss.taboption('advanced', form.Value, 'dtim_period', _('DTIM period'));
                    o.datatype = 'range(1, 255)';
                    o.default = '1';
                    o.rmempty = false;

                    o = ss.taboption("advanced", form.Value, '_skip_channels', _('Auto Channel Skip list'));
                    o.default = uci.get('wireless', radioNet.getName(), '_skip_channels');
                    o.validate = function(section_id, value)
                    {
                        if (value == '') return true;
                        var skip_channels_arr = value.split(';');
                        var channel_idx;
                        var band = uci.get('wireless', radioNet.getName(), 'band');
                        for (let i = 0; i < skip_channels_arr.length; i++){
                            channel_idx = ChannelList[band].indexOf(skip_channels_arr[i]);
                            if (ChannelList[band][channel_idx + 2] != true)
                            {
                                return _('Enter correct channel to skip. Each channel is splitted by ;');
                            }
                            
                        }
                        return true;
                    };

                    for (var i = 0; i < ss.children.length; i++) {
                        set_depends(ss.children[i]);
                    }
                });
            };
        
        };

        o = s.option(form.DummyValue, '_wifi_ifacebox');
        o.modalonly = false;
        o.textvalue = function(section_id) {
            var inst = this.section.lookupRadioOrNetwork(section_id), 
                node = E('div', { 'class': 'center'});
            
            if (inst.getWifiNetworks)
                node.appendChild(render_network_badge(section_id));
            else
                node.appendChild(render_iface_badge(section_id));
    
            return node;
        }

        o = s.option(form.DummyValue, '_wifi_ifacestat');
        o.modalonly = false;
        o.textvalue = function(section_id) {
            var node = E('div', { 'id': '%s-ifc-description'.format(section_id)});
            var is_wifiiface;
            if (section_id == device_2g || section_id == device_5g) {
                is_wifiiface = 0;
            }
            else {
                is_wifiiface = 1;
            }
            render_status(node, section_id, is_wifiiface, null, null);
            poll.add(function(){
                Promise.all([
                    L.resolveDefault(fs.exec_direct('/usr/sbin/iw', ["dev", "ra0", "info"]), {}),
                    L.resolveDefault(fs.exec_direct('/usr/sbin/iw', ["dev", "rai0", "info"]), {}),
                ]).then(function(channel_info){
                    render_status(node, section_id, is_wifiiface, channel_info[0], channel_info[1]);
                    }
                )
            })
            return node;
        };

        return m.render();
    },
    showSaveApplyBtn: false
});
