//
//  Dosh.swift
//  BitPayApp
//
//  Created by Johnathan White on 1/5/22.
//

import Foundation
import PoweredByDosh
import UIKit

struct CustomTheme: PoweredByDoshTheme {
  var showPoweredByDoshMessage: Bool
  // colors
  var headerColor: UIColor = UIColor.init(red: 0x00/255, green: 0x00/255, blue: 0x00/255, alpha: 0xff/255);
  var primaryColor: UIColor = UIColor.init(red: 0x00/255, green: 0x00/255, blue: 0x00/255, alpha: 0xff/255);
  var interactiveColor: UIColor = UIColor.init(red: 0x22/255, green: 0x40/255, blue: 0xc4/255, alpha: 0xff/255);
  
  // font
  let boldFontName: String = "Heebo-Bold";
  let mediumFontName: String = "Heebo-Medium";
  let regularFontName: String = "Heebo-Regular";
  let lightFontName: String = "Heebo-Light";
  
  // nav bar
  var navigationBarStyle: DoshNavigationBarStyle
  
  // brand UI layout style
  var logoStyle: DoshImageStyle = .circular
  var brandDetailsHeaderStyle: DoshBrandDetailsHeaderStyle = .rectangular
}

public class DoshAdapter: NSObject {
  
  @objc static func initDosh(applicationId: String, uiOptions: Dictionary<String, String>) {
    let instance = Dosh.initialize(applicationId: applicationId)
    
    let programName = uiOptions["feedTitle"];
    let logoStyle = uiOptions["logoStyle"] == "RECTANGLE"
      ? DoshImageStyle.roundedRect
      : DoshImageStyle.circular;
    let brandDetailsHeaderStyle = uiOptions["brandDetailsHeaderStyle"] == "DIAGONAL"
      ? DoshBrandDetailsHeaderStyle.diagonal
      : DoshBrandDetailsHeaderStyle.rectangular;
    
    var theme: CustomTheme = CustomTheme(
      showPoweredByDoshMessage: false, navigationBarStyle: DoshNavigationBarStyle(
        backgroundColor: .white,
        separatorColor: .white,
        backButtonImage: UIImage.init(named: "BackArrow")!,
        titleTextStyle: DoshTextStyle(
          weight: .bold,
          size: 18,
          color: UIColor.black
        )
      )
    );
    
    theme.logoStyle = logoStyle;
    theme.brandDetailsHeaderStyle = brandDetailsHeaderStyle;
    
    instance.theme = theme;
    instance.rewardsProgramName = programName;
    instance.debugLoggingEnabled = true;
    
    print("dosh initialized")
  }

  @objc static func present() {
    DispatchQueue.main.async {
      Dosh.instance?.presentRewards(from: (UIApplication.shared.keyWindow?.rootViewController)!)
      print("dosh present")
    }
  }
  
  @objc static func setDoshToken(token: String) {
    print(token)
    Dosh.instance?.userAuthorization = {completion in completion(token)}
    print("dosh set token")
  }
  
  @objc static func clearUser() {
    Dosh.instance?.clearUser()
    print("dosh clear user")
  }
  
};
