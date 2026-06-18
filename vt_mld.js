'use strict';
'require view';
'require dom';
'require poll';
'require fs';
'require ui';
'require uci';
'require form';
'require rpc';

const auth_opts = {
    // 'open': 'OPEN',
    'psk': 'WPA-PSK',
    'psk2': 'WPA2-PSK',
    'psk-mixed': 'WPA-PSK/WPA2-PSK',
    'sae': 'WPA3-SAE',
    'sae-mixed' : 'WPA2-PSK/WPA3-SAE'
};

const cipher_opts = {
    // 'open': {
    //     'none': 'NONE',
    // },
    'psk': {
        'tkip': 'TKIP',
        'aes': 'AES',
        'tkip+aes': 'TKIP/AES'
    },
    'psk2': {
        'tkip': 'TKIP',
        'aes': 'AES',
        'tkip+aes': 'TKIP/AES'
    },
    'psk-mixed': {
        'tkip': 'TKIP',
        'aes': 'AES',
        'tkip+aes': 'TKIP/AES'
    },
    'sae': {
        'aes': 'AES',
    },
    'sae-mixed': {
        'aes': 'AES',
    }
};

const secure_auth_modes = Object.keys(cipher_opts).filter(mode => mode !== 'open');

function add_option_list(option, list) {
    for (const [key, value] of Object.entries(list)) {
        option.value(key, _(value));
    }
}

function authmode_onchange(value)
{
    var cipher = document.getElementById('widget.cbid.wireless.apmld2._cipher');
    var cipher_list = [];

    if (value in cipher_opts) {
        cipher_list = cipher_opts[value];
    }

    cipher.innerHTML = '';

    for (const [key, value] of Object.entries(cipher_list)) {
        const option = document.createElement("option");
        option.value = key;
        option.text = value;
        if (key == 'aes') {
            option.selected = true;
        }
        cipher.appendChild(option);
    }
}

function set_depends(abstractValues) {
	switch (abstractValues.option) {
		case 'ssid':
		case '_auth':
			abstractValues.depends({ disabled: '0' });
			break;
		case 'key':
		case '_cipher':
			secure_auth_modes.forEach(mode => {
				abstractValues.depends({ disabled: '0', _auth: mode });
			})
			break;
		default:
			break;
	}
}

return view.extend({
    load: function() {
        return Promise.all([
            uci.load('wireless')
        ]);
    },
    render: function(data) {
        var m, s, o;
        var cur_auth = uci.get('wireless', 'apmld2', '_auth');
        
        m = new form.Map('wireless', _('Multi-Link Operation Configuration'), _('When MLO is enabled, the MLO configuration will be synchronized to SSID2 on the 2.4GHz band and SSID2 on the 5GHz band. Additionally, SSID2 on both bands will be enabled automatically.'));
        s = m.section(form.NamedSection, 'apmld2', _('Multi-Link Operation Configuration'));

        o = s.option(form.Flag, 'disabled', _('Enable MLO'));
        o.rmempty = false;
        o.keepcfg = true;
        o.enabled = '0';
        o.disabled = '1';
        o.write = function(section_id, formvalue) {
            var hwmode_2g, hwmode_5g;
            var confirm_text = "";
            hwmode_2g = uci.get('wireless', 'MT7993_1_1', 'hwmode');
            hwmode_5g = uci.get('wireless', 'MT7993_1_2', 'hwmode');

            if (hwmode_2g && !hwmode_2g.includes("be")) {
                confirm_text += _("The 2.4G band is not currently in 802.11be mode.") + "\n";
            }
            if (hwmode_5g && !hwmode_5g.includes("be")) {
                confirm_text += _("The 5G band is not currently in 802.11be mode.") + "\n";
            }
            if (confirm_text) {
                confirm_text += _("When MLO is enabled, the system will automatically switch all bands to 802.11be mode. Do you want to continue?");
            }

            if (formvalue == '0' && confirm_text) {
                if (!confirm(confirm_text)) {
                    return Promise.reject();
                }
            }
            uci.set('wireless', section_id, 'disabled', formvalue);
        };
        o = s.option(form.Value, 'ssid', _('Wi-Fi Name'));
        o.rmempty = false;
        o.keepcfg = true;
        o.datatype = 'and(rangelength(1, 32), ssid)';

        o = s.option(form.ListValue, '_auth', _('Authentication'));
        o.rmempty = false;
        o.keepcfg = true;
        o.onchange = function(ev, section_id, value) {
            authmode_onchange(value);
        };
        add_option_list(o, auth_opts);

        o = s.option(form.ListValue, '_cipher', _('Cipher'));
        o.rmempty = false;
        o.keepcfg = true;
        add_option_list(o, cipher_opts[cur_auth] || {});

        o = s.option(form.Value, 'key', _('Wi-Fi Password'));
        o.rmempty = false;
        o.keepcfg = true;
        o.datatype = 'and(rangelength(8, 63), passwordWifi)';


        o = s.option(form.Flag, 'disabled_backhaul', _('Enable MLO Backhaul'));
        o.uciconfig = 'wireless';
        o.ucisection = 'apmld4';
        o.ucioption = 'disabled';
        o.rmempty = false;
        o.keepcfg = true;
        o.enabled = '0';
        o.disabled = '1';

    
		for (var i = 0; i < s.children.length; i++) {
			set_depends(s.children[i]);
		}
        return m.render();
    },
    // showSaveBtn: true
});
