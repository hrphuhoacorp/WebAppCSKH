using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

//using WebAppAPI.Models;

namespace WebAppAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EmailController : ControllerBase
    {
        private readonly IEmailService _emailService;

        public EmailController(IEmailService emailService)
        {
            _emailService = emailService;
        }

        [HttpPost("SendEmailAsync")]
        public async Task SendEmailAsync([FromBody] EmailDTO emailDTO)
        {
            await _emailService.SendEmaiLAsync(emailDTO.To, emailDTO.Subject, emailDTO.Html);
        }
    }
}
