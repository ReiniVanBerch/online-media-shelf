#region

using System;

#endregion

namespace Tiefseetauchner.OnlineMediaShelf.Web.WebObjects;

public record CurrentUserModel(
  bool IsLoggedIn,
  string? UserName,
  string UserId,
  DateTime SignUpDate);