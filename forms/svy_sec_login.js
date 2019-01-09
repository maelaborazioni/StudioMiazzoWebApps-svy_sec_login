/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"005679FE-08EC-4D3C-9967-5921D8FDC193"}
 */
var lang = '';

/**
 * @type {Date}
 *
 * @properties={typeid:35,uuid:"FC497E40-86F2-4E1A-B853-40B7D53C0431",variableType:93}
 */
var vFirstLoginAttempt = null;

/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"7AACB683-BDAC-4E4B-B2A8-9FE195326646"}
 */
var vFramework_db = "svy_framework";

/**
 * @type {Date}
 *
 * @properties={typeid:35,uuid:"D267E971-099D-4824-9F4F-340BAB0E4AB0",variableType:93}
 */
var vLastLoginAttempt = null;

/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"4E2E51EA-C982-457D-9E7B-F6751A09C17E"}
 */
var vOrganization = null;

/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"2A3A8503-29E5-4ACC-9F0E-6F04414981F9"}
 */
var vOwner = null;

/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"64F0246C-7B6D-4456-9BDF-DE8493B342FA"}
 */
var vPassword = "";

/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"0CFA1100-9A85-4326-A145-EBBB390E2804"}
 */
var vUser_db = null;

/**
 * @type {Number}
 *
 * @properties={typeid:35,uuid:"C4EA0620-B89F-42FC-915C-39B324F15594",variableType:4}
 */
var vUser_id = null;

/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"F5DF8054-72FD-4007-A1B4-68932970B087"}
 */
var vUsername = null;

/**
 *	to exit the login screen
 *
 * @author Sanneke Aleman
 * @since 2008-05-04
 * 
 * @properties={typeid:24,uuid:"EF07B993-FC7C-4F87-9788-16E5BF9C5CCE"}
 */
function exit()
{
	application.exit()
}

/**
 *	Method to let the user login, required is the group 'users' this method works with the sec_ tables
 *
 * @author Sanneke Aleman
 * @since 2008-05-04
 * 
 * @properties={typeid:24,uuid:"83BD1830-8ED5-43F7-8278-6EB165DE4211"}
 */
function login()
{
	//check if we should check the hash
	var _validated = security.authenticate('svy_sec_authenticate', 'svy_sec_validateHash',[{owner:vOwner, framework_db:vFramework_db}])

	if (!_validated) {
		plugins.dialogs.showWarningDialog("Can't login","Somebody messed with the security data. Logging in is not possible. Please contact the administrator.","OK");
		if (application.isInDeveloper()) {
			security.authenticate('svy_sec_authenticate', 'svy_sec_recalculateHash', [{owner:vOwner, framework_db:vFramework_db}]);
			plugins.dialogs.showWarningDialog("", "Developer: Hash recalculated, login again.", "OK");
		}
		return;
	}
	
	//check if user name and password are entered
	if((!vUsername) || (!vPassword) || (!vOwner))
	{
		elements.error.text = i18n.getI18NMessage('svy.fr.dlg.username_password_entered')
		return
	}
	
	if (!vFirstLoginAttempt) {
		vFirstLoginAttempt = new Date();
	}	
	
	//user is already choosing organization
	if(vUser_id)
	{	
		//login the organization
		loginWithOrganization();
		return
	}
	

	// Call authentication module/method, authentication is done on server not on the client.
	var _authObj = new Object()
	_authObj.username = vUsername
	_authObj.password = vPassword
	_authObj.owner = vOwner
	_authObj.firstLoginAttempt = vFirstLoginAttempt
	_authObj.lastLoginAttempt = vLastLoginAttempt
	_authObj.framework_db = vFramework_db
	/** @type {{owner_id:String,user_id:String,error:String, success:Boolean}} */
	var _return = security.authenticate('svy_sec_authenticate', 'svy_sec_checkUserPassword',[_authObj])
	if(_return.success)
	{
		// set user id
		globals.svy_sec_lgn_user_id = _return.user_id
		
		// set owner id
		globals.svy_sec_lgn_owner_id = _return.owner_id

		// get organizations, if there are multiple organizations for this user he has to choose his organization
		/** @type {JSDataSet} */
		var _dat_org =  security.authenticate('svy_sec_authenticate', 'svy_sec_getOrganizations', [_return.user_id, _return.owner_id, vFramework_db])
		if(_dat_org.getMaxRowIndex() == 1)//only one organization
		{
			//login
			vUser_id =  _return.user_id
			vOrganization = _dat_org.getValue(1,2)	
			loginWithOrganization()
		}
		else
		{
			// set organization valuelist
			vUser_id = _return.user_id
			application.setValueListItems('svy_sec_lgn_organizations',_dat_org,true)
			elements.lbl_organization.visible = true
			elements.fld_organization.visible = true
			
			// enter the organization id
			if(application.getUserProperty(application.getSolutionName() +'.organization'))
			{
				vOrganization = application.getUserProperty(application.getSolutionName() +'.organization')
//				elements.btnLogin.requestFocus()
			}
			else
			{
				elements.fld_organization.requestFocus()
			}
		}
		
		application.setUserProperty(application.getSolutionName() +'.username',vUsername)
		application.setUserProperty(application.getSolutionName() +'.ownername',vOwner)
		elements.error.text = null;
		
		//for keeping track of logged in users per owner
		application.addClientInfo(_return.owner_id)
	}	
	else	
	{
		if(_return.error)
		   elements.error.text = i18n.getI18NMessage(_return.error)
		else
		   elements.error.text = i18n.getI18NMessage('svy.fr.dlg.loginfailed')
	}
	return;
}

/**
 *	Gets the username, sets the right focus, set the progress bar to 0
 *
 * @author Sanneke Aleman
 * @since 2008-05-04
 * 
 * @properties={typeid:24,uuid:"EF2338B1-2D97-463B-9C84-10360D923B27"}
 */
function onShow()
{
	plugins.busy.prepare();
	
//	var nav_language = globals.svy_sec_getUserProperty('nav_language');
//	if (nav_language)
//	{
//		lang = nav_language
//		i18n.setLocale(lang, i18n.getCurrentCountry())
//	}
//	else
//	{
//		lang = i18n.getCurrentLanguage()	
//	}
//	setFlags();
	onResize()
	
	if (!vOwner) {
		vOwner = application.getUserProperty(application.getSolutionName() +'.ownername'); 
		
	}
	var userName = application.getUserProperty(application.getSolutionName() +'.username');
	
	if (userName)
	{
		vUsername = userName;
		elements.fld_passWord.requestFocus(false);
		return;
	}
	elements.fld_userName.requestFocus(false);
		
}

/**
 * On focus gained password, empty error message
 *
 * @author Sanneke Aleman
 * @since 2008-05-04
 * 
 * @properties={typeid:24,uuid:"DB68A8D6-558C-4F71-A553-40938CA0C741"}
 */
function onFocusGainedPassword()
{
	if (application.getApplicationType() == APPLICATION_TYPES.SMART_CLIENT) {
		capslockPressed();
	} else {
		elements.error.text = '';
	}
}

/**
 * Checks if CAPSLOCK is on (smart client only)
 * 
 * @author Joas de Haan
 * @since 2011-09-06
 * 
 * @properties={typeid:24,uuid:"D81CD6B0-7AB9-4817-ADAA-87FDF4185F6E"}
 */
function capslockPressed() {
	var _capsOn = Packages.java.awt.Toolkit.getDefaultToolkit().getLockingKeyState(Packages.java.awt.event.KeyEvent.VK_CAPS_LOCK);
	if (_capsOn) {
		elements.error.text = i18n.getI18NMessage("svy.fr.lbl.capslock_on");
	} else {
		elements.error.text = '';
	}
}

/**
 * Set the progress bar not visible in webclient
 *
 * @author Sanneke Aleman
 * @since 2008-05-04
 * @param {JSEvent} event
 * 
 * @properties={typeid:24,uuid:"FE19413E-0410-478B-9124-CFF36FAFDE90"}
 */
function onLoad(event)
{
	var _solutionLoadedBefore = application.getUserProperty(application.getSolutionName() + '_loaded')
	application.setUserProperty(application.getSolutionName() + '_loaded','1')
	
	/** @type {String} */
	var _windowSize = security.authenticate('svy_sec_authenticate','svy_sec_getWindowSize', [vFramework_db])
	var _forceWindowSize = security.authenticate('svy_sec_authenticate','svy_sec_getForcedWindowSize', [vFramework_db])
	
	if((_forceWindowSize == 'true' || _solutionLoadedBefore != "1") && _windowSize)
	{
		/** @type {Array} */
		var _sizes = _windowSize.split(',')
		application.getWindow().setSize(_sizes[0]*1, _sizes[1]*1);
	}
	  
	if (application.getApplicationType() == APPLICATION_TYPES.SMART_CLIENT) {
		plugins.window.createShortcut('CAPS_LOCK',forms.svy_sec_login.capslockPressed, 'svy_sec_login');
	}
	
//	//set autologin key in developer
//	if(application.isInDeveloper())
//	   plugins.window.createShortcut('control right',forms.svy_sec_login.autoLoginDeveloper, 'svy_sec_login')
	
	//hide organization fields
	elements.lbl_organization.visible = false
	elements.fld_organization.visible = false
	
	//remove toolbars
	application.setToolbarVisible('text',false)
	application.setToolbarVisible('edit',false)
	
}

/**
 * @properties={typeid:24,uuid:"C1B4540E-C0B2-4D30-B0E9-F8391DE65200"}
 */
function autoLoginDeveloper() {
	if(application.isInDeveloper())
	{
//		vUsername = 'superuser'
//		vPassword = 'superuser'
//		vOwner = 'Servoy'

		vUsername = 'ASSISTENZA';
		vPassword = '165';
//		vUsername = 'PETTINATURA';
//		vPassword = 'PETTINATURA_6520';
		vOwner = 'PETTINATURA LANE SPA';
		
//		vOwner = 'GESTIONE LAVORAZIONI LOGISTICA'
		
//		vUsername = 'DCRLSU84H52G190W';
//		vPassword = 'RESP';
//		vOwner = 'BIO C BON';
		
//		vUsername = 'Erica';
//		vPassword = 'Mae165ed'
//		vOwner = 'MA'
//		vOrganization = 'IT'
		
//		vUsername = 'DEMO';
//		vPassword = 'DEMODEMO';
//		vOwner = 'DEMO';
		
//		vUsername = 'BIOCBON'
//		vPassword = 'BIO_6329'	
//		vOwner = 'BIO C BON'
		
      vUsername = 'Giovanni';
		vPassword = '165';
		vOwner = 'M.A.Elaborazioni';

		login();
	}
}

/**
 * @param {Object} [_oldValue]
 * @param {Object} [_newValue]
 * @properties={typeid:24,uuid:"24117749-D86F-46FC-9AFF-114073E6B954"}
 */
function loginWithOrganization(_oldValue, _newValue) 
{
    // save user name
	application.setUserProperty(application.getSolutionName() +'.username',vUsername);
	globals.svy_sec_lgn_organization_id = vOrganization;
	// save owner name
	application.setUserProperty(application.getSolutionName() +'.ownername',vOwner);
	// save organization id
	application.setUserProperty(application.getSolutionName() +'.organization',vOrganization);
		
	// login
	var _user_org_id = security.authenticate('svy_sec_authenticate', 'svy_sec_login', [vUsername, vUser_id, vOrganization, vFramework_db]);
	
	if(_user_org_id == 0) {
		globals.svy_sec_lgn_user_org_id = 0
		return true;
	} else if (_user_org_id > 0) {
		globals.svy_sec_lgn_user_org_id = _user_org_id;
		return true;
	}
	
	return false;
}

/**
 * Callback method when form is resized.
 *
 * @properties={typeid:24,uuid:"D0314D23-692A-4E5F-B77A-BE8A7C24FE6A"}
 */
function onResize() {
	var _height = application.getWindow().getHeight()
	var _width = application.getWindow().getWidth()
	
	var _org_height = 600
	var _org_width = 1000
	
	var _hResize = (_org_height - _height) / 2
	var _wResize = (_org_width - _width) / 2
	
	var _elements = elements.allnames
	var _component
	var _jsForm = solutionModel.getForm(controller.getName())
	
	for (var i = 0; i < _elements.length; i++) {
		_component = _jsForm.getComponent(_elements[i])
		elements[_elements[i]].setLocation(_component.x - _wResize, _component.y -_hResize )
	}
}