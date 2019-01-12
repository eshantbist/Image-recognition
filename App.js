import React, {Component} from 'react';
import {Image,Button,PixelRatio,PermissionsAndroid,TouchableOpacity,Dimensions,Picker,TextInput,Platform, StyleSheet, Text, View} from 'react-native';
import { Dropdown } from 'react-native-material-dropdown';
let width=Dimensions.get('window').width;
import SmsListener from 'react-native-android-sms-listener'
import RNMlKit from 'react-native-firebase-mlkit';
import { RNCamera, FaceDetector } from 'react-native-camera';
import ImagePicker from 'react-native-image-picker';

export default class App extends Component{

  constructor(props) {
    super(props);
    this.state = {
      countryCode:['91', '1', '86', '7', '20'],
      selectedCountryCode:'91',
      phoneNumber:'',
      gotoVerify:false,
      goToUpload:false,
      code:'',
      message:'',
      avatarSource: null,
      textRecognized:'',
      responseUri:{},
      retrievePage:false,
      retry:false,
    };
    this.SMSReadSubscription = {};
  }

  selectPhotoTapped(){
  const options = {
    quality: 1.0,
    maxWidth: 500,
    maxHeight: 500,
    storageOptions: {
      skipBackup: true,
    },
  }

  ImagePicker.launchCamera(options, (response) => {
      let source = { uri: response.uri };
      this.setState({
        avatarSource: source,
        responseUri:response,
        retry:false,
      });

  });
  }

  recognize=async()=>{
    const deviceTextRecognition = await RNMlKit.deviceTextRecognition(this.state.responseUri.uri);
    console.warn('Text Recognition On-Device', deviceTextRecognition);
    if(deviceTextRecognition==''){
      this.setState({retry:true})
    }
    deviceTextRecognition.map((text)=>{this.setState({textRecognized:text.resultText,retrievePage:true})})
    // this.setState({
    //   avatarSource: source,
    // });
  }


  async requestReadSmsPermission() {
    try {
      var granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS, {
          title: 'Auto Verification OTP',
          message: 'need access to read sms, to verify OTP'
        }
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECEIVE_SMS, {
            title: 'Receive SMS',
            message: 'Need access to receive sms, to verify OTP'
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('RECEIVE_SMS permissions granted', granted);
          this.SMSReadSubscription = SmsListener.addListener(message => {
            let verificationCodeRegex = /Your Pan_card_detector verification code is: ([\d]{4})/
            if (verificationCodeRegex.test(message.body)) {
              let verificationCode = message.body.match(verificationCodeRegex)[1];
              this.setState({code:verificationCode});
              setTimeout(()=>{
                this.verifyOtp();
              },1000)
            }
          });
        } else {
          alert('RECEIVE_SMS permissions denied');
          console.log('RECEIVE_SMS permissions denied');
        }
      } else {
        alert('READ_SMS permissions denied');
        console.log('READ_SMS permissions denied');
      }
    } catch (err) {
      alert(err);
    }
  }

  componentDidMount() {
    this.requestReadSmsPermission();
  }

  componentWillUnmount() {
  //remove listener
  this.SMSReadSubscription.remove();
  }

  onChangeNumber=(number)=>{
    this.setState({phoneNumber:number});
  }

  onChangeCode=(code)=>{
    this.setState({code});
  }

  verifyPhone=()=>{
    const {phoneNumber,selectedCountryCode}=this.state;
    if(phoneNumber.length<10){
      alert('Invalid Number');
    }
    else{
      fetch(`https://api.authy.com/protected/json/phones/verification/start`, {
        method: 'POST',
        headers: {
          'Accept':       'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: '4n51rLa4OLw9UxkNFZ2tx1oMC3fGQb76',
          via:'sms',
          phone_number:phoneNumber,
          country_code:selectedCountryCode,
          locale:'en'
        }),
      })
      this.setState({gotoVerify:true});
    }
  }

  verifyOtp=()=>{
    const {phoneNumber,selectedCountryCode,code}=this.state;
    fetch(`https://api.authy.com/protected/json/phones/verification/check?phone_number=${phoneNumber}&country_code=${selectedCountryCode}&verification_code=${code}`, {
      method: 'GET',
      headers: {
        'Accept':       'application/json',
        'Content-Type': 'application/json',
        'X-Authy-API-Key':'4n51rLa4OLw9UxkNFZ2tx1oMC3fGQb76'
      },
    })
    .then(response => {
             response.json()
            .then(json =>{
              if(json.success===true){
                this.setState({gotoVerify:false});
                this.setState({goToUpload:true});
              }
            })
    })
  }

  avatarContainer=()=>{

    if(this.state.retry===true){
      return(
        <View style={styles.avatarContainer}>
          <Text style={{fontWeight:'900',fontSize:20}}>Image was not clear click another one</Text>
        </View>
      )
    }
    if(this.state.avatarSource === null){
      return(
        <View style={styles.avatarContainer}>
          <Text style={{fontWeight:'900',fontSize:20}}>Touch to click a new pic</Text>
        </View>
      )
    }
    else{
      return(
        <View style={styles.avatarContainer}>
            <Image resizeMode="stretch" style={styles.avatar} source={this.state.avatarSource} />
        </View>
      )
    }
  }
  render() {
    if(this.state.retrievePage===true){
      return(
        <View style={{flex:1,justifyContent:'center',alignItems:'center',marginHorizontal:20,}}>
          <Text style={{fontSize:20,fontWeight:'500'}}>
            {this.state.textRecognized}
          </Text>
          <TouchableOpacity style={{marginVertical:20,alignItems:'center',width:'100%',backgroundColor:'#0077b3',padding:10}} onPress={()=>{this.setState({retrievePage:false,avatarSource: null,})}}>
            <Text style={{color:'black',fontSize:15,fontWeight:'700'}}>Click New Pic</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if(this.state.goToUpload===true){
      return(
        <View style={{flex:1,justifyContent:'center',alignItems:'center'}}>
        <TouchableOpacity onPress={()=>this.selectPhotoTapped()}>
          {this.avatarContainer()}
        </TouchableOpacity>
        {this.state.avatarSource!==null
          ?(<TouchableOpacity style={{marginVertical:20,alignItems:'center',width:'100%',backgroundColor:'#0077b3',padding:10}} onPress={()=>this.recognize()}>
            <Text style={{color:'black',fontSize:15,fontWeight:'700'}}>Retrive text from pic</Text>
          </TouchableOpacity>)
          :(<View></View>)
        }
        </View>
      );
    }

    if(this.state.gotoVerify===false){
      let countryCodes = this.state.countryCode.map( (s, i) => {
          return <Picker.Item key={i} value={s} label={s} />
      });
      return(
        <View style={styles.container}>
          <Text style={{fontSize:20,fontWeight:'700'}}>PHONE NUMBER</Text>
          <View style={{width:width,borderRadius:10,backgroundColor:'#cccccc',flexDirection:'row',width:'100%',marginVertical:20}}>
            <Picker
            mode='dropdown'
            selectedValue={this.state.selectedCountryCode}
            onValueChange={ (code) => ( this.setState({selectedCountryCode:code}) ) }
            style={{ height: 50, width: 100 }}>
            {countryCodes}
            </Picker>
            <TextInput
                  placeholder='Enter your phone number'
                  style={{alignItems:'center'}}
                  onChangeText={number => this.onChangeNumber(number)}
                  keyboardType='numeric'
                  onSubmitEditing={()=>this.verifyPhone()}
                />
          </View>
          <TouchableOpacity style={{alignItems:'center',width:'100%',backgroundColor:'#0077b3',padding:10}} onPress={()=>this.verifyPhone()}>
            <Text style={{color:'black',fontSize:15,fontWeight:'700'}}>Send Otp</Text>
          </TouchableOpacity>
        </View>
      );
    }
    else{
        return(
            <View style={styles.container}>
              <Text style={{fontSize:20,fontWeight:'700'}}>PHONE NUMBER AUTO VERIFICATION</Text>
              <View style={{width:width,borderRadius:10,backgroundColor:'#cccccc',width:'100%',marginVertical:20}}>
                <TextInput
                      placeholder='WAIT!!!! OTP IS COMING'
                      style={{alignItems:'center'}}
                      value={this.state.code}
                      editable={false}
                    />
                <TouchableOpacity style={{alignItems:'center',width:'100%',backgroundColor:'#0077b3',padding:10}} onPress={()=>this.verifyPhone()}>
                  <Text style={{color:'black',fontSize:15,fontWeight:'700'}}>Resend Otp</Text>
                </TouchableOpacity>
              </View>
            </View>
        );
    }
  }
}

const styles = StyleSheet.create({
container: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  marginHorizontal:20,
},
avatarContainer: {
  borderColor: '#9B9B9B',
  borderWidth: 1 / PixelRatio.get(),
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor:'white',
  width: 400,
  height: 400,
  borderRadius: 10,
},
avatar: {
  borderRadius: 10,
  width: 400,
  height: 400,
},
});
